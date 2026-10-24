-- Membership removal has to reach the file rooms the removed user still has open.
--
-- A room re-checks a session's access in updateRoomForFileRecord, which only runs when the *file*
-- row changes. Removing someone writes to group_user and touches no file row, so nothing wakes the
-- rooms and an already-open socket keeps syncing until it happens to reconnect. The effect outbox
-- is the existing path for "a Postgres change must reach a Durable Object", so route it there:
-- TLFileEffectProcessor dispatches on "tableName" and processGroupUserEffect drops the sessions.
--
-- DELETE only. A role change is a different problem (the session keeps access but at the wrong
-- level) and needs different handling than closing the socket, so it deliberately writes no row.

CREATE OR REPLACE FUNCTION group_user_effect_outbox_fn() RETURNS trigger AS $$
BEGIN
	INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
	-- entityId is the removed user; the group is read from the payload. Nothing keys off entityId
	-- besides logging, and the pair is what the handler needs.
	VALUES ('group_user', OLD."userId", 'delete', to_jsonb(OLD));
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_user_effect_outbox_after_delete
AFTER DELETE ON public.group_user
FOR EACH ROW EXECUTE FUNCTION group_user_effect_outbox_fn();
