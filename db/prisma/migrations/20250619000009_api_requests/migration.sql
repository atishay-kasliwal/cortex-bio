-- API request logging for /v1 usage analytics

CREATE TABLE "api_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key_id" UUID,
    "user_id" UUID,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_requests_api_key_id_created_at_idx"
    ON "api_requests"("api_key_id", "created_at" DESC);
CREATE INDEX "api_requests_endpoint_created_at_idx"
    ON "api_requests"("endpoint", "created_at" DESC);
CREATE INDEX "api_requests_created_at_idx"
    ON "api_requests"("created_at" DESC);

ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_api_key_id_fkey"
    FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
