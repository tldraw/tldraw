-- How many files a library is added to, counting files the user can't see, so a workspace's
-- libraries list can flag the ones in no file. Kept by triggers on file_library; a file or
-- library delete cascades through file_library, so its rows' triggers count those too.

ALTER TABLE public."library" ADD COLUMN "fileCount" INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION count_library_files() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    -- matches nothing when the library itself is being deleted
    UPDATE public."library" SET "fileCount" = "fileCount" - 1 WHERE "id" = OLD."libraryId";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE public."library" SET "fileCount" = "fileCount" + 1 WHERE "id" = NEW."libraryId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "count_library_files_trigger"
AFTER INSERT OR DELETE OR UPDATE OF "libraryId" ON public."file_library"
FOR EACH ROW
EXECUTE FUNCTION count_library_files();

UPDATE public."library" l
SET "fileCount" = counts.n
FROM (
  SELECT "libraryId", COUNT(*)::INTEGER AS n FROM public."file_library" GROUP BY "libraryId"
) counts
WHERE l."id" = counts."libraryId";
