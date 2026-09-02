-- Drops the legacy user-owns-file model (issue #10050).
--
-- Every file has lived in a workspace since the groups migration, `file."ownerId"` has been
-- NULL throughout production since then, and #10391 removed the last code that read it. What
-- remains is the schema itself plus the trigger functions that still maintain it.
--
-- Postgres tracks dependencies for indexes, foreign keys, check constraints and a trigger's
-- `UPDATE OF` column list, so those drop or block on their own. It does NOT parse plpgsql
-- bodies: a function still naming a dropped column survives the DDL and fails at runtime on
-- the next write. That is why the function work below is explicit, and comes first.
--
-- The runner puts the whole migration in one transaction (migrate.ts). A transaction with any
-- DDL on a replicated table resets every view-syncer pipeline and rehydrates connected clients,
-- once per transaction rather than per statement, and Zero is notified once after all of it.
-- Deploy off-peak, and only after #10653 has shipped: a client whose schema still declares
-- these columns is disconnected the moment they drop.

-- Fails before any DDL if a file still has no workspace, with a message that says so. Without
-- this the first thing to notice is the SET NOT NULL at the very end.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."file" WHERE "owningGroupId" IS NULL) THEN
    RAISE EXCEPTION 'files without an owningGroupId remain; every file must belong to a workspace before the legacy owner columns can be dropped';
  END IF;
END $$;

-- These exist only to maintain the legacy columns.

DROP TRIGGER IF EXISTS trigger_update_file_state_on_file_change ON public."file";
DROP FUNCTION IF EXISTS public.update_file_state_on_file_change();

DROP TRIGGER IF EXISTS trigger_update_is_file_owner ON public."file_state";
DROP FUNCTION IF EXISTS public.update_is_file_owner();

DROP TRIGGER IF EXISTS update_file_owner_details_trigger ON public."user";
DROP FUNCTION IF EXISTS public.update_file_owner_details();

-- The runtime backfill that moved users onto the groups model, and the source of the
-- `owningGroupId`-without-`group_file` orphans repaired ahead of this migration: it set
-- `owningGroupId` for every file a user owned but created links only for files the user had a
-- `file_state` row for, so a file its owner had never opened got the id and no link.
DROP FUNCTION IF EXISTS public.migrate_user_to_groups(text, text);

-- Was two arms, one per ownership model. Only the group arm is reachable now, its
-- `"ownerAvatar" = ''` assignment goes with the column, and its null check goes with the
-- NOT NULL constraint at the end of this migration: nothing writes `file` in between.
CREATE OR REPLACE FUNCTION public.set_file_owner_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "file"
  SET "ownerName" = g."name"
  FROM public."group" g
  WHERE g."id" = NEW."owningGroupId" AND "file"."id" = NEW."id";
  RETURN NEW;
END;
$function$;

-- Redefined rather than left alone: its column list still named "ownerId".
CREATE OR REPLACE TRIGGER set_file_owner_details_trigger
AFTER INSERT OR UPDATE OF "owningGroupId" ON public."file"
FOR EACH ROW EXECUTE FUNCTION set_file_owner_details();

CREATE OR REPLACE FUNCTION public.update_file_group_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "file"
  SET "ownerName" = NEW.name
  WHERE "owningGroupId" = NEW.id;
  RETURN NEW;
END;
$function$;

-- Both dropped guards were already no-ops: `ownerId` is NULL on every row, and
-- `NULL IS DISTINCT FROM x` is TRUE, so neither ever excluded anything. The `group_user`
-- membership checks are what actually protect an owner's own state on unshare.
CREATE OR REPLACE FUNCTION public.delete_file_states()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state fs
    WHERE fs."fileId" = OLD.id
      -- not a current member of the owning group
      AND NOT EXISTS (
        SELECT 1 FROM group_user gu
        WHERE gu."groupId" = OLD."owningGroupId"
          AND gu."userId" = fs."userId"
      );

    DELETE FROM group_file gf
    WHERE gf."fileId" = OLD.id
      -- never the owning group's own row: that's where the file lives
      AND gf."groupId" <> OLD."owningGroupId"
      -- not a home-group link of a current owning-group member
      AND NOT EXISTS (
        SELECT 1 FROM group_user gu
        WHERE gu."groupId" = OLD."owningGroupId"
          AND gu."userId" = gf."groupId"
      );
  END IF;
  RETURN NEW;
END;
$function$;

-- Only the no-op short-circuit changes: "ownerId" leaves the list of columns whose change is
-- worth an outbox row. Miss this and every file write starts producing effects again.
CREATE OR REPLACE FUNCTION public.file_effect_outbox_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
	IF TG_OP = 'INSERT' THEN
		INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
		VALUES ('file', NEW.id, 'insert', to_jsonb(NEW));
		RETURN NEW;
	ELSIF TG_OP = 'UPDATE' THEN
		-- Skip no-op updates: room persists bump "updatedAt" every few seconds per active
		-- room; only effect-relevant columns should produce outbox rows.
		IF NEW.name IS NOT DISTINCT FROM OLD.name
			AND NEW.shared IS NOT DISTINCT FROM OLD.shared
			AND NEW."sharedLinkType" IS NOT DISTINCT FROM OLD."sharedLinkType"
			AND NEW.published IS NOT DISTINCT FROM OLD.published
			AND NEW."lastPublished" IS NOT DISTINCT FROM OLD."lastPublished"
			AND NEW."publishedSlug" IS NOT DISTINCT FROM OLD."publishedSlug"
			AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted"
			AND NEW."owningGroupId" IS NOT DISTINCT FROM OLD."owningGroupId"
		THEN
			RETURN NEW;
		END IF;
		INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload, "prevPayload")
		VALUES ('file', NEW.id, 'update', to_jsonb(NEW), to_jsonb(OLD));
		RETURN NEW;
	ELSE
		INSERT INTO public.effect_outbox ("tableName", "entityId", command, payload)
		VALUES ('file', OLD.id, 'delete', to_jsonb(OLD));
		RETURN OLD;
	END IF;
END;
$function$;

-- Postgres would drop all three with the column; spelled out so reviewing this does not
-- require knowing that.

DROP INDEX IF EXISTS public.file_owner_index;
ALTER TABLE public."file" DROP CONSTRAINT IF EXISTS "file_owner_xor_check";
ALTER TABLE public."file" DROP CONSTRAINT IF EXISTS "file_ownerId_fkey";

-- `file_state."isPinned"` needs no backfill: the client has read pin state from
-- `group_file."index"` since groups landed, so the ~331 rows still saying `true` have had no
-- effect for months. Copying them into `index` would re-pin boards that are currently
-- unpinned, and `unpinFile` writes the same `index = NULL` those rows would be matched by, so
-- a deliberate unpin is indistinguishable from a never-migrated pin.

ALTER TABLE public."file" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE public."file" DROP COLUMN IF EXISTS "ownerAvatar";
ALTER TABLE public."file_state" DROP COLUMN IF EXISTS "isFileOwner";
ALTER TABLE public."file_state" DROP COLUMN IF EXISTS "isPinned";

-- With the legacy model gone, every file belongs to a workspace.
ALTER TABLE public."file" ALTER COLUMN "owningGroupId" SET NOT NULL;
