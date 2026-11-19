CREATE TABLE "job_labour_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_card_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"minutes" integer NOT NULL,
	"note" text,
	"visibility" "visibility" DEFAULT 'internal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_labour_entries" ADD CONSTRAINT "job_labour_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_labour_entries" ADD CONSTRAINT "job_labour_entries_job_card_id_job_cards_id_fk" FOREIGN KEY ("job_card_id") REFERENCES "public"."job_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_labour_entries" ADD CONSTRAINT "job_labour_entries_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_labour_entries_job_idx" ON "job_labour_entries" USING btree ("tenant_id","job_card_id");--> statement-breakpoint
CREATE INDEX "job_labour_entries_technician_idx" ON "job_labour_entries" USING btree ("tenant_id","technician_id","started_at");
