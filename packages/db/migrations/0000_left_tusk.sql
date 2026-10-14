DO $$ BEGIN
 CREATE TYPE "public"."decision_verdict" AS ENUM('APPROVED', 'ESCALATED', 'DENIED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."delivery_event_type" AS ENUM('TRACKING_ADDED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."escalation_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."capture_mode" AS ENUM('immediate', 'on_delivery');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mandate_status" AS ENUM('active', 'suspended', 'revoked', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."purchase_request_status" AS ENUM('REQUESTED', 'EVALUATING', 'DENIED', 'ESCALATED', 'APPROVED', 'AUTHORIZED', 'AWAITING_DELIVERY', 'CAPTURED', 'VOIDED', 'TIMED_OUT', 'EXPIRED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_record_status" AS ENUM('AUTHORIZED', 'REAUTHORIZED', 'CAPTURED', 'VOIDED', 'REFUNDED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_entry_type" AS ENUM('REQUEST_RECEIVED', 'DECISION_MADE', 'ESCALATION_CREATED', 'ESCALATION_RESOLVED', 'PAYMENT_AUTHORIZED', 'PAYMENT_REAUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_VOIDED', 'PAYMENT_REFUNDED', 'DELIVERY_CONFIRMED', 'MANDATE_CREATED', 'MANDATE_UPDATED', 'MANDATE_REVOKED', 'KILL_SWITCH_ACTIVATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"api_key_hash" varchar(255) NOT NULL,
	"api_key_prefix" varchar(8) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_request_id" uuid NOT NULL,
	"verdict" "decision_verdict" NOT NULL,
	"rule_results" jsonb NOT NULL,
	"llm_verdict" "decision_verdict",
	"llm_reason" text,
	"llm_risk_flags" jsonb,
	"llm_confidence" numeric(4, 3),
	"injection_detected" boolean DEFAULT false NOT NULL,
	"injection_details" text,
	"plain_reason" text NOT NULL,
	"signed_receipt" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_purchase_request_id_unique" UNIQUE("purchase_request_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_request_id" uuid NOT NULL,
	"event_type" "delivery_event_type" NOT NULL,
	"tracking_number" varchar(128),
	"carrier" varchar(64),
	"paypal_tracking_id" varchar(64),
	"raw_payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_request_id" uuid NOT NULL,
	"reviewed_by_id" uuid,
	"status" "escalation_status" DEFAULT 'PENDING' NOT NULL,
	"leash_reasoning" text NOT NULL,
	"human_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "escalations_purchase_request_id_unique" UNIQUE("purchase_request_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"public_key" text,
	"vault_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mandates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"purpose_embedding" text,
	"total_budget_cents" integer NOT NULL,
	"spent_cents" integer DEFAULT 0 NOT NULL,
	"reserved_cents" integer DEFAULT 0 NOT NULL,
	"per_purchase_cap_cents" integer NOT NULL,
	"escalate_above_cents" integer NOT NULL,
	"allowed_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"merchant_allowlist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_purchases_per_day" integer DEFAULT 10 NOT NULL,
	"velocity_window_hours" integer DEFAULT 24 NOT NULL,
	"allow_reroute" boolean DEFAULT false NOT NULL,
	"dedup_similarity_threshold" numeric(4, 3) DEFAULT '0.85' NOT NULL,
	"cluster_budget_cap_cents" integer,
	"capture_mode" "capture_mode" DEFAULT 'on_delivery' NOT NULL,
	"delivery_sla_hours" integer DEFAULT 72 NOT NULL,
	"reauthorize_before_hours" integer DEFAULT 24 NOT NULL,
	"status" "mandate_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"owner_signature" text,
	"signed_at" timestamp with time zone,
	CONSTRAINT "mandates_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"mandate_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"item_description" text,
	"vendor_name" text NOT NULL,
	"vendor_id" text,
	"category" text,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"justification" text NOT NULL,
	"product_metadata" jsonb,
	"item_embedding" text,
	"status" "purchase_request_status" DEFAULT 'REQUESTED' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluated_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"escalation_expires_at" timestamp with time zone,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	CONSTRAINT "purchase_requests_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_request_id" uuid NOT NULL,
	"paypal_order_id" varchar(64) NOT NULL,
	"paypal_authorization_id" varchar(64),
	"paypal_capture_id" varchar(64),
	"paypal_request_id" varchar(64) NOT NULL,
	"status" "payment_record_status" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"authorized_at" timestamp with time zone,
	"honor_period_ends_at" timestamp with time zone,
	"authorization_expires_at" timestamp with time zone,
	"reauthorize_job_id" text,
	"captured_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"raw_order_snapshot" text,
	"raw_capture_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" integer NOT NULL,
	"mandate_id" uuid NOT NULL,
	"entry_type" "ledger_entry_type" NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"previous_hash" varchar(64) NOT NULL,
	"entry_hash" varchar(64) NOT NULL,
	"actor_type" varchar(32) NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"job_id" text,
	"processed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decisions" ADD CONSTRAINT "decisions_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escalations" ADD CONSTRAINT "escalations_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escalations" ADD CONSTRAINT "escalations_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mandates" ADD CONSTRAINT "mandates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mandates" ADD CONSTRAINT "mandates_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_mandate_id_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."mandates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
