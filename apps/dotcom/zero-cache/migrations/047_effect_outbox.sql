-- Generic transactional outbox for server-side effects. Rows are written by
-- row-level triggers on source tables (only "file" today) so every write path is
-- captured, including the cleanup_deleted_group_trigger cascade. Drained by
-- TLFileEffectProcessor in sync-worker, which dispatches on "tableName".
-- Future effect sources (e.g. notifications) add a trigger + a consumer handler.
-- NOT added to the zero_data publication: server-only table.

CREATE TABLE public.effect_outbox (
	id            BIGSERIAL PRIMARY KEY,
	"tableName"   VARCHAR NOT NULL,  -- source table
	"entityId"    VARCHAR NOT NULL,  -- source row id
	command       VARCHAR NOT NULL,  -- 'insert' | 'update' | 'delete'
	payload       JSONB NOT NULL,    -- NEW row (OLD for delete)
	"prevPayload" JSONB,             -- full OLD row, updates only
	attempts      INT NOT NULL DEFAULT 0,
	"createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION file_effect_outbox_fn() RETURNS trigger AS $$
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
			AND NEW."ownerId" IS NOT DISTINCT FROM OLD."ownerId"
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_effect_outbox_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.file
FOR EACH ROW EXECUTE FUNCTION file_effect_outbox_fn();
