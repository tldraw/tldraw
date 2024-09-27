-- this is sqlite3 schema
-- specifically, this is cloudflare D1 running sqlite3

DROP TABLE IF EXISTS topics;
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY NOT NULL,
  schema JSON NOT NULL,
  tombstones JSON NOT NULL,
  clock INTEGER NOT NULL
);

DROP TABLE IF EXISTS records;
CREATE TABLE IF NOT EXISTS records (
  id TEXT NOT NULL UNIQUE,
  topicId TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  record JSON NOT NULL,
  lastModifiedEpoch INTEGER NOT NULL,
  PRIMARY KEY (id, topicId)
);

CREATE INDEX IF NOT EXISTS lastModifiedEpochIndex ON records(lastModifiedEpoch);