CREATE TABLE "user_boot_id" (
  "userId" VARCHAR NOT NULL PRIMARY KEY,
	"bootId" VARCHAR NOT NULL
);

-- drop the replicator_boot table later

CREATE INDEX file_owner_index ON public.file ("ownerId");
CREATE INDEX file_shared_index ON public.file ("shared");