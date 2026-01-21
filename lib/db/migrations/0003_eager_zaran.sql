CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week" integer NOT NULL,
	"exercise" varchar(255) NOT NULL,
	"sets" integer NOT NULL,
	"reps_per_set" jsonb NOT NULL,
	"volume" integer NOT NULL,
	"weighted_volume" integer NOT NULL,
	"avg_rpe" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;