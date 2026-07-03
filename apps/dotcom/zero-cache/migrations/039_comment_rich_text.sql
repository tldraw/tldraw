-- Store comment bodies as rich text (the TLComment record's TLRichText JSON) instead of
-- flattened plaintext, so the projected copy preserves the authoritative representation.
-- Existing plaintext rows are wrapped into a single-paragraph rich text document, matching
-- the shape produced by tlschema's toRichText().
ALTER TABLE comment ADD COLUMN "body" JSONB;

UPDATE comment
SET "body" = CASE
  WHEN "text" = '' THEN jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))
  )
  ELSE jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', "text"))
      )
    )
  )
END;

ALTER TABLE comment ALTER COLUMN "body" SET NOT NULL;
ALTER TABLE comment DROP COLUMN "text";
