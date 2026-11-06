-- A deleted collection item's content and thumbnail are stored in R2, which the sync worker
-- removes when it drains this row (see processCollectionItemEffect). Deletes only: items are never
-- edited, and moving one between collections leaves its objects where they are. Fires for items
-- removed by the collection or workspace foreign key cascades too.

CREATE OR REPLACE FUNCTION collection_item_effect_outbox_fn() RETURNS trigger AS $$
BEGIN
	INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
	VALUES ('collection_item', OLD.id, 'delete', to_jsonb(OLD));
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_item_effect_outbox_after_delete
AFTER DELETE ON public.collection_item
FOR EACH ROW EXECUTE FUNCTION collection_item_effect_outbox_fn();
