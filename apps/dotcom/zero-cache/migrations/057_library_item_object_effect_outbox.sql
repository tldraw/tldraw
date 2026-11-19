-- Queues an R2 object for the sync worker to delete (see processLibraryItemObjectEffect) when the
-- last library_item_object row naming it goes, which happens when items are deleted on their own
-- or with their library or workspace.
--
-- The check locks the row it finds, so a transaction deleting that row at the same moment waits
-- for this one, then finds this one's row gone and queues the object. A row another transaction
-- has deleted but not committed is locked already: SKIP LOCKED passes over it, rather than waiting
-- on a transaction that may be waiting on this one, and this one queues the object. Both may queue
-- it, or queue it for a delete that rolls back; the worker checks again that no row names the
-- object before deleting it, so that is harmless.

CREATE OR REPLACE FUNCTION library_item_object_effect_outbox_fn() RETURNS trigger AS $$
BEGIN
	PERFORM 1 FROM public.library_item_object
	WHERE "bucket" = OLD."bucket" AND "objectName" = OLD."objectName"
	LIMIT 1
	FOR KEY SHARE SKIP LOCKED;
	IF NOT FOUND THEN
		INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
		VALUES (
			'library_item_object',
			OLD."bucket" || '/' || OLD."objectName",
			'delete',
			jsonb_build_object('bucket', OLD."bucket", 'objectName', OLD."objectName")
		);
	END IF;
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_item_object_effect_outbox_after_delete
AFTER DELETE ON public.library_item_object
FOR EACH ROW EXECUTE FUNCTION library_item_object_effect_outbox_fn();
