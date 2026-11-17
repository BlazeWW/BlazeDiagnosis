ALTER TABLE "invoices" ADD COLUMN "quote_id" uuid REFERENCES "quotes"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_number_unique" ON "invoices" ("tenant_id", "invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_quote_unique" ON "invoices" ("tenant_id", "quote_id");
CREATE TABLE IF NOT EXISTS "invoice_sequences" (
    "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
    "year" integer NOT NULL,
    "last_number" integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("tenant_id", "year")
);