ALTER TABLE "stripe_connected_account" RENAME COLUMN "last_webhook_created_at" TO "webhook_sync_version";--> statement-breakpoint
UPDATE "stripe_connected_account" SET "webhook_sync_version" = 0 WHERE "webhook_sync_version" IS NULL;--> statement-breakpoint
ALTER TABLE "stripe_connected_account" ALTER COLUMN "webhook_sync_version" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "stripe_connected_account" ALTER COLUMN "webhook_sync_version" SET NOT NULL;
