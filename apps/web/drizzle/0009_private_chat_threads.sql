ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_sender_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "sender_user_id" TYPE text USING "sender_user_id"::text;--> statement-breakpoint
CREATE TABLE "chat_thread_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"participant_type" varchar(20) NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "chat_thread_participants" ADD CONSTRAINT "chat_thread_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread_participants" ADD CONSTRAINT "chat_thread_participants_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_thread_participants_thread_user_idx" ON "chat_thread_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX "chat_thread_participants_tenant_user_idx" ON "chat_thread_participants" USING btree ("tenant_id","user_id");--> statement-breakpoint
INSERT INTO "chat_thread_participants" ("tenant_id", "thread_id", "user_id", "participant_type", "last_read_at")
SELECT DISTINCT
	"chat_threads"."tenant_id",
	"chat_threads"."id",
	"customers"."user_id"::text,
	'customer',
	now()
FROM "chat_threads"
INNER JOIN "customers"
	ON "customers"."id" = "chat_threads"."customer_id"
	AND "customers"."tenant_id" = "chat_threads"."tenant_id"
WHERE "customers"."user_id" IS NOT NULL
ON CONFLICT ("thread_id", "user_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "chat_thread_participants" ("tenant_id", "thread_id", "user_id", "participant_type", "last_read_at")
SELECT
	"chat_messages"."tenant_id",
	"chat_messages"."thread_id",
	"chat_messages"."sender_user_id",
	CASE
		WHEN "users"."role" = 'customer' THEN 'customer'
		WHEN "users"."role" = 'parts_supplier' THEN 'supplier'
		ELSE 'staff'
	END,
	COALESCE(MAX("chat_messages"."created_at"), now())
FROM "chat_messages"
INNER JOIN "users"
	ON "users"."id"::text = "chat_messages"."sender_user_id"
GROUP BY
	"chat_messages"."tenant_id",
	"chat_messages"."thread_id",
	"chat_messages"."sender_user_id",
	"users"."role"
ON CONFLICT ("thread_id", "user_id") DO NOTHING;--> statement-breakpoint
CREATE INDEX "chat_messages_tenant_thread_created_idx" ON "chat_messages" USING btree ("tenant_id","thread_id","created_at");
