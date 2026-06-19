# Backend Setup (Node.js & PostgreSQL)
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    job_card_number VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE (tenant_id, job_card_number) -- Scoped uniqueness
);

CREATE TABLE parts_tracking (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL, -- Isolated tenant field
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    estimated_delivery DATE,
    is_delayed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Index for tenant queries has been added
CREATE INDEX idx_parts_tenant_status ON parts_tracking (tenant_id, status, estimated_delivery);

# API Implementation Strategy

<!-- Recording Parts: INSERT INTO parts_tracking (job_id, part_name, quantity) VALUES ($1, $2, $3)Linking to Job: Fetch with a join: SELECT * FROM parts_tracking JOIN jobs ON parts_tracking.job_id = jobs.id WHERE jobs.job_card_number = $1
Flagging Delays: Run a daily function using node-cron to automatically flag overdue parts:
UPDATE parts_tracking 
SET is_delayed = TRUE 
WHERE status != 'Delivered' AND estimated_delivery < CURRENT_DATE; -->

# Database Setup (Drizzle Schema)

import { pgTable, uuid, varchar, text, integer, date, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Jobs Table
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  jobCardNumber: varchar('job_card_number', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tenant_job_card_idx').on(table.tenantId, table.jobCardNumber)
]);

// Parts Tracking Table
export const partsTracking = pgTable('parts_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  partName: varchar('part_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  status: varchar('status', { length: 50 }).default('Pending').notNull(),
  estimatedDelivery: date('estimated_delivery'),
  isDelayed: boolean('is_delayed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relationships
export const jobsRelations = relations(jobs, ({ many }) => ({
  parts: many(partsTracking),
}));

export const partsTrackingRelations = relations(partsTracking, ({ one }) => ({
  job: one(jobs, {
    fields: [partsTracking.jobId],
    references: [jobs.id],
  }),
}));


# Express API Endpoints (Node.js + Drizzle Prisma)

import { db } from './db'; 
import { jobs, partsTracking } from './schema';
import { and, eq } from 'drizzle-orm';

app.post('/api/parts', async (req, res) => {
  const { jobCardNumber, partName, quantity } = req.body;
  const tenantId = req.user.tenantId; 

  // Validate input fields
  if (!jobCardNumber || !partName || !quantity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Upsert job record
    const [job] = await db.insert(jobs)
      .values({ tenantId, jobCardNumber })
      .onConflictDoUpdate({
        target: [jobs.tenantId, jobs.jobCardNumber],
        set: { tenantId } 
      })
      .returning();

    // Insert tracking part linked to job ID
    const [newPart] = await db.insert(partsTracking)
      .values({ 
        tenantId, 
        jobId: job.id, 
        partName, 
        quantity 
      })
      .returning();

    return res.status(201).json(newPart);
  } catch (error) {
    console.error('Error creating part:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


# Update Delivery Status & Notify

app.patch('/api/parts/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = req.user.tenantId;

  try {
    // Scoped update prevents cross-tenant cross-talk
    const updatedParts = await db.update(partsTracking)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(partsTracking.id, id),
          eq(partsTracking.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedParts.length) {
      return res.status(404).json({ error: 'Part record not found in this scope.' });
    }

    // Fetch relational data safely
    const updatedPartWithJob = await db.query.partsTracking.findFirst({
      where: eq(partsTracking.id, id),
      with: { job: true }
    });

    if (status === 'Delivered') {
      await sendNotification(updatedPartWithJob.job.jobCardNumber, updatedPartWithJob.partName, tenantId);
    }

    return res.status(200).json(updatedPartWithJob);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



# Automatic Delay Flagging (Daily Cron Job)

import cron from 'node-cron';
import { db } from './db';
import { partsTracking } from './schema';
import { and, not, eq, lt } from 'drizzle-orm';

const updateDelayedParts = async () => {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // Extract current date in YYYY-MM-DD format
    const result = await db.update(partsTracking)
      .set({ isDelayed: true })
      .where(
        and(
          not(eq(partsTracking.status, 'Delivered')),
          lt(partsTracking.estimatedDelivery, currentDate)
        )
      );

    console.log(`[Cron Executed] Parts flagged as delayed: ${result.changes} parts updated.`);
  } catch (error) {
    console.error('Error updating delayed parts:', error);
  }
};

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', updateDelayedParts);



# Frontend UI Component (React + Tailwind CSS)

<!-- import React, { useState, useEffect } from 'react';

export default function PartsTracker({ jobId }) {
  const [parts, setParts] = useState([]);

  
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await fetch(`/api/parts/job/${jobId}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setParts(data);
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };

    fetchParts();
  }, [jobId]);

  const renderStatusBadge = (status) => {
    const statusClasses = {
      Delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      Ordered: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      Default: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusClasses[status] || statusClasses.Default}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-xl shadow-2xl max-w-xl border border-slate-800">
      <h2 className="text-xl font-semibold mb-4 text-white tracking-wide">Parts Tracking</h2>
      
      <div className="space-y-3">
        {parts.map((part) => (
          <div key={part.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <div>
              <p className="font-medium text-white">{part.partName}</p>
              <p className="text-xs text-slate-400">Qty: {part.quantity}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {renderStatusBadge(part.status)}

              {/* Delay Warning Flag */}
              {part.isDelayed && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                  Delayed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} -->

# Added a fetch parts job

app.get('/api/parts/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    const parts = await db
      .select()
      .from(partsTracking)
      .where(
        and(
          eq(partsTracking.jobId, jobId),
          eq(partsTracking.tenantId, tenantId)
        )
      );

    return res.status(200).json(parts);
  } catch (error) {
    console.error('Error fetching parts:', error); // Added logging for better debugging
    return res.status(500).json({ error: 'Internal Server Error' }); // More generic error message
  }
});




