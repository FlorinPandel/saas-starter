ALTER TABLE "users" ADD COLUMN "sex" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age" integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bodyweight" integer DEFAULT 65 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "experience" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "progression_rate" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fatigue_sensitivity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fatigue" integer DEFAULT 0;