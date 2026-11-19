-- Sync with the upstream turbo-template.
--
-- Replaces four upstream migrations that forked from `20260608075420_rbac` in
-- parallel with this repo's `ippms_foundation` chain. They were never applied
-- to any database here, so they are re-derived as one linear step rather than
-- spliced into the graph (drizzle rejects the fork as non-commutative).
--
-- What came from where:
--   * idempotency_keys  — upstream created it, then reshaped it to an
--     identity-scoped, expiring cache. Created directly in that final shape,
--     so upstream's TRUNCATE step is unnecessary: there are no rows to drop.
--   * audit_logs        — gains upstream's stronger audit columns (outcome,
--     old_value, new_value, reason). Upstream carried these on a separate
--     `audit_log` table; that table is deliberately NOT created here. This
--     repo keeps one audit trail, and these columns fold upstream's
--     guarantees into it.
--   * verifications     — upstream's expiry index, for the sweep.

CREATE TABLE "idempotency_keys" (
	"key" text,
	"author_id" text,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("author_id","key")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "outcome" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "old_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "new_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "reason" text;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");--> statement-breakpoint
CREATE INDEX "verifications_expires_at_idx" ON "verifications" ("expires_at");