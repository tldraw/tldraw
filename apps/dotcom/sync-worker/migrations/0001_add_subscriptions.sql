-- this is sqlite3 schema
-- specifically, this is cloudflare D1 running sqlite3

DROP TABLE IF EXISTS subscriptions;
CREATE TABLE IF NOT EXISTS subscriptions (
  subscriberTopicId TEXT NOT NULL,
  recordId TEXT NOT NULL,
  recordEpochAtLastNotify INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subscriberTopicId, recordId) ON CONFLICT REPLACE,
  FOREIGN KEY (subscriberTopicId) REFERENCES topics (id) ON DELETE CASCADE,
  FOREIGN KEY (recordId) REFERENCES records (id) ON DELETE CASCADE
);
