-- Workspace collections: named sets of saved shapes. A collection belongs to one workspace
-- ("owningGroupId"), the same model as file."owningGroupId"; collections private to a user belong
-- to their home workspace, whose id is the user's id. Every member of the workspace sees them.
--
-- Rows hold listing metadata only and sync through Zero. An item's content (shapes JSON, which can
-- run to megabytes) and its thumbnail are stored in R2 by the sync worker, keyed by the item id,
-- so they are never replicated to every member's client.

CREATE TABLE collection (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "owningGroupId" VARCHAR NOT NULL,
  -- authorship only, and no FK to "user": deleting a user must not delete collections the rest of
  -- the workspace still uses (the same reasoning as comment_thread."createdBy")
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  -- e.g. the pack a collection was copied from: { "packId", "packVersion" }
  "meta" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT collection_owning_group_id_fkey FOREIGN KEY ("owningGroupId") REFERENCES public."group"("id") ON DELETE CASCADE
);

CREATE INDEX collection_owning_group_id_idx ON collection("owningGroupId");

CREATE TABLE collection_item (
  "id" VARCHAR PRIMARY KEY,
  "collectionId" VARCHAR NOT NULL,
  -- null until someone names it: adding from the canvas doesn't ask for a name
  "name" VARCHAR,
  -- the stored thumbnail's media type, e.g. image/png; null when the item has none
  "thumbnailType" VARCHAR,
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT collection_item_collection_id_fkey FOREIGN KEY ("collectionId") REFERENCES public."collection"("id") ON DELETE CASCADE
);

CREATE INDEX collection_item_collection_id_idx ON collection_item("collectionId");

ALTER PUBLICATION zero_data ADD TABLE public."collection", public."collection_item";
