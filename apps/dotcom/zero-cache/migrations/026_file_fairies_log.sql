-- Create file_fairies_log table for full fairy chat history
CREATE TABLE file_fairies_log (
  id VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "userId" VARCHAR NOT NULL,
  "agentId" VARCHAR NOT NULL,
  "historyItem" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL
);

CREATE INDEX file_fairies_log_lookup ON file_fairies_log("fileId", "userId", "agentId", "createdAt");
