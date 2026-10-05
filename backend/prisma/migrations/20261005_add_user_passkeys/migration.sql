-- CreateTable user_passkeys
CREATE TABLE IF NOT EXISTS "user_passkeys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "credential_id" VARCHAR(500) NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_name" VARCHAR(100),
    "device_type" VARCHAR(50),
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ,

    CONSTRAINT "user_passkeys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_passkeys_credential_id_key" UNIQUE ("credential_id"),
    CONSTRAINT "user_passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_passkeys_user_id_idx" ON "user_passkeys"("user_id");

-- CreateTable auth_challenges
CREATE TABLE IF NOT EXISTS "auth_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "challenge" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_challenges_challenge_key" UNIQUE ("challenge")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auth_challenges_expires_at_idx" ON "auth_challenges"("expires_at");
