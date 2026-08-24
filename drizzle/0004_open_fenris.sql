ALTER TABLE "stripe_webhook_event" ALTER COLUMN "processed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "stripe_webhook_event" ALTER COLUMN "processed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_webhook_event" ADD COLUMN "processing_token" text;--> statement-breakpoint
ALTER TABLE "stripe_webhook_event" ADD COLUMN "processing_expires_at" timestamp;