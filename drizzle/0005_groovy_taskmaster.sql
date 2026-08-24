ALTER TABLE "stripe_connected_account" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "stripe_connected_account" ADD COLUMN "refresh_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "stripe_connected_account" DROP COLUMN "webhook_sync_version";