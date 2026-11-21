-- The R2 objects each library item uses: its content in the ROOMS bucket, and in the uploads
-- bucket its thumbnails and the copies of the images and videos its content refers to, made when
-- it was added so deleting the board they came from can't break it. A library's copy doesn't copy
-- these objects: its items get rows naming the same ones. An object is deleted once no row names
-- it any more (057).
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
