CREATE TABLE "billing_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"normalized_type" varchar(100),
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_item_id" varchar(255) NOT NULL,
	"provider_price_id" varchar(255) NOT NULL,
	"provider_product_id" varchar(255),
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_items_provider_item_id_unique" UNIQUE("provider_item_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_sub_id" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider_price_id" varchar(255),
	"provider_product_id" varchar(255),
	"quantity" integer DEFAULT 1 NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_sub_id_unique" UNIQUE("provider_sub_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_provider" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pm_type" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pm_last_four" varchar(4);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;