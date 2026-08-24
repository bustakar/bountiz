CREATE TYPE "public"."campaign_status" AS ENUM('pending_payment', 'funded');--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"budget_amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "campaign_status" DEFAULT 'pending_payment' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"funded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_stripe_checkout_session_id_uidx" ON "campaign" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_stripe_payment_intent_id_uidx" ON "campaign" USING btree ("stripe_payment_intent_id");