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
  CONSTRAINT library_owning_group_id_fkey FOREIGN KEY ("owningGroupId") REFERENCES public."group"("id") ON DELETE CASCADE
);

CREATE INDEX library_owning_group_id_idx ON library("owningGroupId");

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
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT library_item_library_id_fkey FOREIGN KEY ("libraryId") REFERENCES public."library"("id") ON DELETE CASCADE
);

CREATE INDEX library_item_library_id_idx ON library_item("libraryId");

ALTER PUBLICATION zero_data ADD TABLE public."library", public."library_item";

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
