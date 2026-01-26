CREATE TABLE "max_performance_by_week" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week" integer NOT NULL,
	"plank_seconds" integer NOT NULL,
	"push_ups" integer NOT NULL,
	"squats" integer NOT NULL,
	"situps" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "max_performance_by_week" ADD CONSTRAINT "max_performance_by_week_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "max_performance_by_week" ADD CONSTRAINT "max_performance_by_week_user_week_unique" UNIQUE ("user_id", "week");
