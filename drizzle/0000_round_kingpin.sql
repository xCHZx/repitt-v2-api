CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"address" text,
	"phone" varchar(20),
	"category_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"repitt_code" varchar(20) NOT NULL,
	"opening_hours" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"logo_path" varchar(500),
	"qr_path" varchar(500),
	"flyer_path" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "businesses_repitt_code_unique" UNIQUE("repitt_code")
);
--> statement-breakpoint
CREATE TABLE "account_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stamp_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"required_stamps" integer NOT NULL,
	"required_hours" integer NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"stamp_icon_path" varchar(500),
	"primary_color" varchar(50),
	"business_id" integer NOT NULL,
	"reward" varchar(255),
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_stamp_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stamp_card_id" integer NOT NULL,
	"repitt_code" varchar(20) NOT NULL,
	"visits_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_reward_redeemed" boolean DEFAULT false NOT NULL,
	"qr_path" varchar(500),
	"completed_at" timestamp,
	"redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stamp_cards_repitt_code_unique" UNIQUE("repitt_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255) NOT NULL,
	"repitt_code" varchar(20) NOT NULL,
	"password" varchar(255) NOT NULL,
	"account_status_id" integer NOT NULL,
	"qr_path" varchar(500),
	"has_verified_email" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_repitt_code_unique" UNIQUE("repitt_code")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_stamp_card_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_cards" ADD CONSTRAINT "stamp_cards_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stamp_cards" ADD CONSTRAINT "user_stamp_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stamp_cards" ADD CONSTRAINT "user_stamp_cards_stamp_card_id_stamp_cards_id_fk" FOREIGN KEY ("stamp_card_id") REFERENCES "public"."stamp_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_status_id_account_statuses_id_fk" FOREIGN KEY ("account_status_id") REFERENCES "public"."account_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_stamp_card_id_user_stamp_cards_id_fk" FOREIGN KEY ("user_stamp_card_id") REFERENCES "public"."user_stamp_cards"("id") ON DELETE no action ON UPDATE no action;