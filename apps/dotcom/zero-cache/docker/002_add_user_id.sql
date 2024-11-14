CREATE TABLE "replicator_user_boot_id" (
	"replicatorId" VARCHAR NOT NULL,
  "userId" VARCHAR NOT NULL,
	"bootId" VARCHAR NOT NULL,
  PRIMARY KEY ("replicatorId", "userId")
);

-- drop the old table later