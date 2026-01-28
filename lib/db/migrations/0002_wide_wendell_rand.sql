CREATE TABLE "predicted_actual_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"exercise" varchar(255) NOT NULL,
	"predicted" integer NOT NULL,
	"actual" integer NOT NULL,
	"week" integer NOT NULL,
	"rpe" integer NOT NULL,
	"feeling" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "predicted_actual_plan" ADD CONSTRAINT "predicted_actual_plan_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;