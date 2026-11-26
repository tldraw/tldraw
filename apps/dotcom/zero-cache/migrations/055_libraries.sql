-- Workspace libraries: named sets of saved shapes. A library belongs to one workspace
-- ("owningGroupId"), the same model as file."owningGroupId"; libraries private to a user belong
-- to their home workspace, whose id is the user's id. Every member of the workspace sees them.
--
-- Rows hold listing metadata only and sync through Zero. An item's content (shapes JSON, which can
-- run to megabytes) is stored privately in R2 by the sync worker, under the row's "contentKey", so
-- it is never replicated to every member's client. Its thumbnail images are public uploads at
-- unguessable URLs, like a board's images, and the row holds those URLs. A library's copy shares
-- these objects with the items it was copied from (see library_item_object below).

CREATE TABLE library (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "owningGroupId" VARCHAR NOT NULL,
  -- authorship only, and no FK to "user": deleting a user must not delete libraries the rest of
  -- the workspace still uses (the same reasoning as comment_thread."createdBy")
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  -- e.g. the pack a library was copied from: { "packId", "packVersion" }
  "meta" JSONB NOT NULL DEFAULT '{}',
  -- a user's default library, shown on every board they open. It lives in their home workspace,
  -- whose id is the user's id, so one default per home workspace is one default per user.
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  -- how many files the library is added to, counting files the user can't see, so a workspace's
  -- libraries list can flag the ones in no file; kept by count_library_files below
  "fileCount" INTEGER NOT NULL DEFAULT 0,
  -- how many items it has, so libraries can be listed with their counts without syncing every
  -- item; kept by count_library_items below
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT library_owning_group_id_fkey FOREIGN KEY ("owningGroupId") REFERENCES public."group"("id") ON DELETE CASCADE,
  CONSTRAINT library_default_in_home_workspace CHECK (NOT "isDefault" OR "owningGroupId" = "createdBy")
);

CREATE INDEX library_owning_group_id_idx ON library("owningGroupId");

CREATE UNIQUE INDEX library_one_default_per_user_idx ON library("owningGroupId") WHERE "isDefault";

CREATE TABLE library_item (
  "id" VARCHAR PRIMARY KEY,
  "libraryId" VARCHAR NOT NULL,
  -- null until someone names it: adding from the canvas doesn't ask for a name
  "name" VARCHAR,
  -- the thumbnail's URL, or { "light", "dark" } URLs for an item with one per colour mode; null
  -- when the item has none
  "thumbnail" JSONB,
  -- the ROOMS bucket key of the item's content; server-only, left out of the Zero schema
  "contentKey" VARCHAR NOT NULL,
  -- as a library's meta: opaque data the client stores with the item, e.g. the category and tags
  -- it had in the starter pack it was copied from
  "meta" JSONB NOT NULL DEFAULT '{}',
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT library_item_library_id_fkey FOREIGN KEY ("libraryId") REFERENCES public."library"("id") ON DELETE CASCADE
);

CREATE INDEX library_item_library_id_idx ON library_item("libraryId");

-- Libraries added to a file. A file's panel shows the libraries added to it, to everyone who can
-- access the file, members of the library's workspace or not; only those who can edit the file
-- add or remove them. Rows go with either the file or the library.
CREATE TABLE file_library (
  "fileId" VARCHAR NOT NULL,
  "libraryId" VARCHAR NOT NULL,
  -- authorship only, and no FK to "user", as library."createdBy"
  "addedBy" VARCHAR NOT NULL,
  "addedAt" BIGINT NOT NULL,
  PRIMARY KEY ("fileId", "libraryId"),
  CONSTRAINT file_library_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT file_library_library_id_fkey FOREIGN KEY ("libraryId") REFERENCES public."library"("id") ON DELETE CASCADE
);

CREATE INDEX file_library_library_id_idx ON file_library("libraryId");

ALTER PUBLICATION zero_data ADD TABLE public."library", public."library_item", public."file_library";

-- The R2 objects each library item uses: its content in the ROOMS bucket, and in the uploads
-- bucket its thumbnails and the copies of the images and videos its content refers to, made when
-- it was added so deleting the board they came from can't break it. A library's copy doesn't copy
-- these objects: its items get rows naming the same ones. An object is deleted once no row names
-- it any more (see the trigger below).
--
-- Rows go with their item. Server-only, not in the zero_data publication.

CREATE TABLE library_item_object (
  "itemId" VARCHAR NOT NULL,
  "bucket" VARCHAR NOT NULL CHECK ("bucket" IN ('rooms', 'uploads')),
  "objectName" VARCHAR NOT NULL,
  PRIMARY KEY ("itemId", "bucket", "objectName"),
  CONSTRAINT library_item_object_item_id_fkey FOREIGN KEY ("itemId") REFERENCES public."library_item"("id") ON DELETE CASCADE
);

CREATE INDEX library_item_object_object_idx ON library_item_object("bucket", "objectName");

-- Queues an R2 object for the sync worker to delete (see processLibraryItemObjectEffect) when the
-- last library_item_object row naming it goes, which happens when items are deleted on their own
-- or with their library or workspace.
--
-- The trigger runs once per statement, cascades included, and checks each object the statement's
-- deleted rows name once, so a statement that deletes several rows naming one object, such as a
-- delete of two libraries that share it, queues it once.
--
-- The check locks the row it finds, so a transaction deleting that row at the same moment waits
-- for this one, then finds this one's row gone and queues the object. A row another transaction
-- has deleted but not committed is locked already: SKIP LOCKED passes over it, rather than waiting
-- on a transaction that may be waiting on this one, and this one queues the object. Both may queue
-- it, or queue it for a delete that rolls back; the worker checks again that no row names the
-- object before deleting it, so that is harmless.

CREATE OR REPLACE FUNCTION library_item_object_effect_outbox_fn() RETURNS trigger AS $$
DECLARE
	obj RECORD;
BEGIN
	FOR obj IN SELECT DISTINCT "bucket", "objectName" FROM deleted LOOP
		PERFORM 1 FROM public.library_item_object
		WHERE "bucket" = obj."bucket" AND "objectName" = obj."objectName"
		LIMIT 1
		FOR KEY SHARE SKIP LOCKED;
		IF NOT FOUND THEN
			INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
			VALUES (
				'library_item_object',
				obj."bucket" || '/' || obj."objectName",
				'delete',
				jsonb_build_object('bucket', obj."bucket", 'objectName', obj."objectName")
			);
		END IF;
	END LOOP;
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_item_object_effect_outbox_after_delete
AFTER DELETE ON public.library_item_object
REFERENCING OLD TABLE AS deleted
FOR EACH STATEMENT EXECUTE FUNCTION library_item_object_effect_outbox_fn();

-- library."fileCount", kept by triggers on file_library; a file or library delete cascades through
-- file_library, so its rows' triggers count those too.
CREATE OR REPLACE FUNCTION count_library_files() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    -- matches nothing when the library itself is being deleted
    UPDATE public."library" SET "fileCount" = "fileCount" - 1 WHERE "id" = OLD."libraryId";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE public."library" SET "fileCount" = "fileCount" + 1 WHERE "id" = NEW."libraryId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "count_library_files_trigger"
AFTER INSERT OR DELETE OR UPDATE OF "libraryId" ON public."file_library"
FOR EACH ROW
EXECUTE FUNCTION count_library_files();

-- library."itemCount", kept by triggers on library_item; a library delete cascades through
-- library_item, whose rows' triggers then match no library.
CREATE OR REPLACE FUNCTION count_library_items() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE public."library" SET "itemCount" = "itemCount" - 1 WHERE "id" = OLD."libraryId";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE public."library" SET "itemCount" = "itemCount" + 1 WHERE "id" = NEW."libraryId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "count_library_items_trigger"
AFTER INSERT OR DELETE OR UPDATE OF "libraryId" ON public."library_item"
FOR EACH ROW
EXECUTE FUNCTION count_library_items();
