-- BD-067 performance dataset. SYNTHETIC DATA ONLY: never run against a shared or production database.
-- Run on a throwaway Postgres whose schema was created with `drizzle-kit push` (or migrations 0000+).
--   psql -v ON_ERROR_STOP=1 -f perf/seed.sql
-- Workshop A is busy (the load target); workshop B is small and exists to prove tenant isolation.
-- IDs are derived from md5(label), so every run produces the same rows and perf/load.js can rebuild them.

\set a_customers 5000
\set a_vehicles 6000
\set a_jobs 20000
\set a_invoices 4000
\set b_customers 50
\set b_jobs 200

BEGIN;

INSERT INTO tenants (id, name, slug) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Perf Workshop A', 'perf-a'),
  ('00000000-0000-4000-8000-0000000000b1', 'Perf Workshop B', 'perf-b');

-- Staff: 20 mechanics + 3 floor managers in A, 2 mechanics in B.
INSERT INTO users (id, tenant_id, name, email, role)
SELECT md5('A-user-' || i)::uuid, '00000000-0000-4000-8000-0000000000a1',
       'Perf Staff A' || i, 'staff-a' || i || '@perf.local',
       CASE WHEN i <= 20 THEN 'mechanic' ELSE 'floor_manager' END
FROM generate_series(1, 23) AS i;
INSERT INTO users (id, tenant_id, name, email, role)
SELECT md5('B-user-' || i)::uuid, '00000000-0000-4000-8000-0000000000b1',
       'Perf Staff B' || i, 'staff-b' || i || '@perf.local', 'mechanic'
FROM generate_series(1, 2) AS i;

-- Customers.
INSERT INTO customers (id, tenant_id, first_name, last_name, email, phone)
SELECT md5('A-cust-' || i)::uuid, '00000000-0000-4000-8000-0000000000a1',
       (ARRAY['Thabo','Lerato','Sipho','Anele','Pieter','Johan','Aisha','Ruan','Naledi','Kagiso'])[1 + i % 10],
       (ARRAY['Nkosi','Dlamini','van Wyk','Botha','Mokoena','Naidoo','Smith','Pillay','Khumalo','Venter'])[1 + (i / 10) % 10],
       'cust-a' || i || '@perf.local', '082' || lpad(i::text, 7, '0')
FROM generate_series(1, :a_customers) AS i;
INSERT INTO customers (id, tenant_id, first_name, last_name, email, phone)
SELECT md5('B-cust-' || i)::uuid, '00000000-0000-4000-8000-0000000000b1',
       'Bee' || i, 'Smith', 'cust-b' || i || '@perf.local', '083' || lpad(i::text, 7, '0')
FROM generate_series(1, :b_customers) AS i;

-- Vehicles: vehicle v belongs to customer ((v - 1) % customers) + 1.
INSERT INTO vehicles (id, tenant_id, primary_customer_id, make, model, registration_number)
SELECT md5('A-veh-' || v)::uuid, '00000000-0000-4000-8000-0000000000a1',
       md5('A-cust-' || (((v - 1) % :a_customers) + 1))::uuid,
       (ARRAY['Toyota','VW','Ford','Nissan','BMW','Hyundai'])[1 + v % 6],
       (ARRAY['Corolla','Polo','Ranger','NP200','3 Series','i20'])[1 + v % 6],
       'PERF' || lpad(v::text, 5, '0') || 'GP'
FROM generate_series(1, :a_vehicles) AS v;
INSERT INTO vehicles (id, tenant_id, primary_customer_id, make, model, registration_number)
SELECT md5('B-veh-' || v)::uuid, '00000000-0000-4000-8000-0000000000b1',
       md5('B-cust-' || v)::uuid, 'Toyota', 'Hilux', 'PERFB' || lpad(v::text, 4, '0') || 'GP'
FROM generate_series(1, :b_customers) AS v;

-- Job cards spread over the last year. Job j uses vehicle ((j - 1) % vehicles) + 1 and that vehicle's owner.
INSERT INTO job_cards (id, tenant_id, customer_id, vehicle_id, job_number, internal_status, customer_status,
                       assigned_mechanic_id, created_at, completed_at, expected_completion_at)
SELECT md5('A-job-' || j)::uuid, '00000000-0000-4000-8000-0000000000a1',
       md5('A-cust-' || (((((j - 1) % :a_vehicles) + 1) - 1) % :a_customers + 1))::uuid,
       md5('A-veh-' || (((j - 1) % :a_vehicles) + 1))::uuid,
       'JOB-A-' || lpad(j::text, 6, '0'),
       s.internal::job_internal_status, s.customer::job_customer_status,
       CASE WHEN j % 10 < 7 THEN md5('A-user-' || (1 + j % 20))::uuid END,
       now() - make_interval(days => j % 365, mins => j % 1440),
       CASE WHEN s.internal = 'completed' THEN now() - make_interval(days => j % 365) END,
       now() + make_interval(days => (j % 14) - 4)
FROM generate_series(1, :a_jobs) AS j
CROSS JOIN LATERAL (
  SELECT (ARRAY['completed','completed','completed','completed','completed','completed',
                'work_in_progress','awaiting_parts','awaiting_customer_approval','diagnostics_in_progress',
                'quality_control','cancelled'])[1 + j % 12] AS internal
) i
CROSS JOIN LATERAL (
  SELECT i.internal AS internal,
         CASE i.internal
           WHEN 'completed' THEN 'completed' WHEN 'cancelled' THEN 'cancelled'
           WHEN 'awaiting_parts' THEN 'waiting_for_parts' WHEN 'awaiting_customer_approval' THEN 'awaiting_approval'
           WHEN 'quality_control' THEN 'final_checks' ELSE 'service_in_progress'
         END AS customer
) s;
INSERT INTO job_cards (id, tenant_id, customer_id, vehicle_id, job_number, internal_status, customer_status, created_at)
SELECT md5('B-job-' || j)::uuid, '00000000-0000-4000-8000-0000000000b1',
       md5('B-cust-' || (((j - 1) % :b_customers) + 1))::uuid,
       md5('B-veh-' || (((j - 1) % :b_customers) + 1))::uuid,
       'JOB-B-' || lpad(j::text, 5, '0'),
       'work_in_progress', 'service_in_progress', now() - make_interval(days => j % 90)
FROM generate_series(1, :b_jobs) AS j;

-- Invoices for the first N job cards in A (dashboard "outstanding invoices").
INSERT INTO invoices (tenant_id, job_card_id, customer_id, invoice_number, status, total, issued_at, due_at)
SELECT jc.tenant_id, jc.id, jc.customer_id, 'INV-A-' || lpad(n::text, 6, '0'),
       (ARRAY['paid','paid','issued','overdue','partially_paid','draft'])[1 + n % 6]::invoice_status,
       (500 + (n * 37) % 9500)::numeric(12, 2),
       jc.created_at, jc.created_at + interval '30 days'
FROM generate_series(1, :a_invoices) AS n
JOIN job_cards jc ON jc.id = md5('A-job-' || n)::uuid;

COMMIT;

ANALYZE;

SELECT t.slug,
       (SELECT count(*) FROM customers c WHERE c.tenant_id = t.id) AS customers,
       (SELECT count(*) FROM vehicles v WHERE v.tenant_id = t.id) AS vehicles,
       (SELECT count(*) FROM job_cards j WHERE j.tenant_id = t.id) AS job_cards,
       (SELECT count(*) FROM invoices i WHERE i.tenant_id = t.id) AS invoices
FROM tenants t WHERE t.slug LIKE 'perf-%' ORDER BY t.slug;
