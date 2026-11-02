-- Zero's server insert is ON CONFLICT DO NOTHING, so reusing a workspace id would add the caller as
-- its owner. Only a user may join their home, and owners are inserted only by a group's creator.
CREATE OR REPLACE FUNCTION public.reject_workspace_takeover() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."groupId" <> NEW."userId" AND (
    -- also covers a home whose user row doesn't exist yet
    NEW."groupId" LIKE 'user\_%'
    OR EXISTS (SELECT 1 FROM public."user" WHERE "id" = NEW."groupId")
  ) THEN
    RAISE EXCEPTION 'cannot add % to home workspace %', NEW."userId", NEW."groupId"
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."role" = 'owner' AND (
    NOT EXISTS (SELECT 1 FROM public."group" WHERE "id" = NEW."groupId" AND NOT "isDeleted")
    -- the same user passes, so concurrent first sign-ins still reach ON CONFLICT DO NOTHING
    OR EXISTS (
      SELECT 1 FROM public."group_user"
      WHERE "groupId" = NEW."groupId" AND "userId" <> NEW."userId"
    )
  ) THEN
    RAISE EXCEPTION 'cannot insert % as owner of existing workspace %', NEW."userId", NEW."groupId"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "reject_workspace_takeover_trigger"
BEFORE INSERT ON public."group_user"
FOR EACH ROW
EXECUTE FUNCTION public.reject_workspace_takeover();
