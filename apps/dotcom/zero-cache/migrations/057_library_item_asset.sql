-- The uploads-bucket objects a library item owns: copies, made when the item was added or
-- copied, of the images and videos its content refers to, so deleting the board they came from
-- can't break the item. The sync worker writes these rows with the item's row, and deletes the
-- objects and the rows when it drains the item's delete from effect_outbox (056).
--
-- No foreign key to library_item: the rows have to outlive the item until that cleanup runs.
-- Server-only, not in the zero_data publication.

CREATE TABLE library_item_asset (
  "itemId" VARCHAR NOT NULL,
  "objectName" VARCHAR NOT NULL,
  PRIMARY KEY ("itemId", "objectName")
);
