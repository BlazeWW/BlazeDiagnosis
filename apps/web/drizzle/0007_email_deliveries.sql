CREATE TABLE "email_deliveries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "invoice_id" uuid NOT NULL,
    "event_type" varchar(40) NOT NULL,
    "status" varchar(20) DEFAULT 'queued' NOT NULL,
    "idempotency_key" varchar(255) NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "provider_reference" text,
    "failure_code" varchar(80),
    "next_attempt_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "email_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "email_deliveries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "email_delivery_attempts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "delivery_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "attempt_number" integer NOT NULL,
    "status" varchar(20) NOT NULL,
    "provider_reference" text,
    "failure_code" varchar(80),
    "attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "email_delivery_attempts_delivery_id_email_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE,
    CONSTRAINT "email_delivery_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_tenant_idempotency_idx" ON "email_deliveries" ("tenant_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "email_deliveries_tenant_status_idx" ON "email_deliveries" ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX "email_deliveries_invoice_idx" ON "email_deliveries" ("invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_attempts_delivery_number_idx" ON "email_delivery_attempts" ("delivery_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX "email_delivery_attempts_tenant_time_idx" ON "email_delivery_attempts" ("tenant_id", "attempted_at");
