CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens" ("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");
