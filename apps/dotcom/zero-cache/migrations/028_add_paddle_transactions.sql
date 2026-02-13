
CREATE TABLE paddle_transactions (
  "eventId" VARCHAR PRIMARY KEY,
  "transactionId" VARCHAR NOT NULL,
  "eventType" VARCHAR NOT NULL,
  "status" VARCHAR NOT NULL,
  "userId" VARCHAR,
  "processed" BOOLEAN NOT NULL DEFAULT FALSE,
  "processedAt" BIGINT,
  "processingError" TEXT,
  "eventData" JSONB NOT NULL,
  "occurredAt" BIGINT NOT NULL,
  "receivedAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE INDEX paddle_transactions_processing_idx ON paddle_transactions("transactionId", "eventType", "processed") WHERE "eventType" = 'transaction.completed';

CREATE INDEX paddle_transactions_user_idx ON paddle_transactions("userId", "occurredAt") WHERE "userId" IS NOT NULL;

CREATE INDEX paddle_transactions_transaction_id_idx ON paddle_transactions("transactionId", "occurredAt");
