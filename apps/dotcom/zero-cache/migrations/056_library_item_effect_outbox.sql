-- A deleted library item's content and thumbnail images are stored in R2, which the sync worker
-- removes when it drains this row (see processLibraryItemEffect); the payload, the deleted row,
-- names the thumbnails' uploads. Deletes only: items are never
-- edited, and moving one between libraries leaves its objects where they are. Fires for items
-- removed by the library or workspace foreign key cascades too.

CREATE OR REPLACE FUNCTION library_item_effect_outbox_fn() RETURNS trigger AS $$
BEGIN
	INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
	VALUES ('library_item', OLD.id, 'delete', to_jsonb(OLD));
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_item_effect_outbox_after_delete
AFTER DELETE ON public.library_item
FOR EACH ROW EXECUTE FUNCTION library_item_effect_outbox_fn();
