-- this is sqlite3 schema
-- specifically, this is cloudflare D1 running sqlite3

DROP TABLE IF EXISTS TMP_auth;
DROP TABLE IF EXISTS topics;

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY NOT NULL,
  schema TEXT NOT NULL,
  tombstones TEXT NOT NULL,
  clock INTEGER NOT NULL
);

DROP TABLE IF EXISTS records;
CREATE TABLE IF NOT EXISTS records (
  id TEXT NOT NULL,
  topicId TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  record TEXT NOT NULL,
  lastModifiedEpoch INTEGER NOT NULL,
  PRIMARY KEY (id, topicId)
);

CREATE INDEX IF NOT EXISTS topicIdIndex ON records(topicId);
CREATE INDEX IF NOT EXISTS lastModifiedEpochIndex ON records(lastModifiedEpoch);