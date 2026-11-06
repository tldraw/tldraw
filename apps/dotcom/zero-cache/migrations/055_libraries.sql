-- Workspace libraries: named sets of saved shapes. A library belongs to one workspace
-- ("owningGroupId"), the same model as file."owningGroupId"; libraries private to a user belong
-- to their home workspace, whose id is the user's id. Every member of the workspace sees them.
--
-- Rows hold listing metadata only and sync through Zero. An item's content (shapes JSON, which can
-- run to megabytes) is stored privately in R2 by the sync worker, keyed by the item id, so it is
-- never replicated to every member's client. Its thumbnail images are public uploads at unguessable
-- URLs, like a board's images, and the row holds those URLs.

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
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT library_item_library_id_fkey FOREIGN KEY ("libraryId") REFERENCES public."library"("id") ON DELETE CASCADE
);

CREATE INDEX library_item_library_id_idx ON library_item("libraryId");

ALTER PUBLICATION zero_data ADD TABLE public."library", public."library_item";
