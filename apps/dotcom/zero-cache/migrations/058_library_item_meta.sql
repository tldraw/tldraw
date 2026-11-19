-- An item's meta, as a library's (055): opaque data the client stores with the item, e.g. the
-- category and tags it had in the starter pack it was copied from.
ALTER TABLE public."library_item" ADD COLUMN "meta" JSONB NOT NULL DEFAULT '{}';
