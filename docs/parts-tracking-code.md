# Backend Setup (Node.js & PostgreSQL)

<!-- CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_card_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE parts_tracking (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Ordered, Shipped, Delivered
    estimated_delivery DATE,
    is_delayed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); -->

# API Implementation Strategy

<!-- Recording Parts: INSERT INTO parts_tracking (job_id, part_name, quantity) VALUES ($1, $2, $3)Linking to Job: Fetch with a join: SELECT * FROM parts_tracking JOIN jobs ON parts_tracking.job_id = jobs.id WHERE jobs.job_card_number = $1
Flagging Delays: Run a daily function using node-cron to automatically flag overdue parts:
UPDATE parts_tracking 
SET is_delayed = TRUE 
WHERE status != 'Delivered' AND estimated_delivery < CURRENT_DATE; -->

# Database Setup (Prisma Schema)

<!-- model Job {
  id            String          @id @default(uuid())
  jobCardNumber String          @unique
  description   String?         @db.Text // Using @db.Text for potentially longer descriptions
  parts         PartsTracking[]  @relation("JobParts") // Named relation for clarity
  createdAt     DateTime        @default(now())
}

model PartsTracking {
  id                String   @id @default(uuid())
  jobId             String
  job               Job      @relation("JobParts", fields: [jobId], references: [id], onDelete: Cascade)
  partName          String
  quantity          Int      @default(1)
  status            String   @default("Pending") // Pending, Ordered, Shipped, Delivered
  estimatedDelivery DateTime?
  isDelayed         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
} -->

# Express API Endpoints (Node.js + Prisma)

<!-- app.post('/api/parts', async (req, res) => {
  const { jobCardNumber, partName, quantity } = req.body;

  if (!jobCardNumber || !partName || !quantity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Use upsert to find or create the job card
    const job = await prisma.job.upsert({
      where: { jobCardNumber },
      update: {},
      create: { jobCardNumber }
    });

    // Create a new part tracking entry
    const newPart = await prisma.partsTracking.create({
      data: { jobId: job.id, partName, quantity }
    });

    return res.status(201).json(newPart);
  } catch (error) {
    console.error('Error creating part:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}); -->


# Update Delivery Status & Notify

<!-- pp.patch('/api/parts/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // e.g., "Delivered"

  try {
    const updatedPart = await prisma.partsTracking.update({
      where: { id },
      data: { status },
      include: { job: true }
    });

    // Trigger notification if status is Delivered
    if (status === 'Delivered') {
      await sendNotification(updatedPart.job.jobCardNumber, updatedPart.partName);
    }

    res.status(200).json(updatedPart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); -->

# Automatic Delay Flagging (Daily Cron Job)

<!-- import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updateDelayedParts = async () => {
  try {
    const result = await prisma.partsTracking.updateMany({
      where: {
        status: { not: 'Delivered' },
        estimatedDelivery: { lt: new Date() }
      },
      data: { isDelayed: true }
    });
    console.log(`${result.count} parts updated to delayed status.`);
  } catch (error) {
    console.error('Error updating parts:', error);
  }
};

cron.schedule('0 0 * * *', updateDelayedParts); -->


# Frontend UI Component (React + Tailwind CSS)

<!-- import React, { useState, useEffect } from 'react';

export default function PartsTracker({ jobId }) {
  const [parts, setParts] = useState([]);

  // Fetch parts data from Node.js API
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







