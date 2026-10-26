-- Backstop for the workspace mutators. Zero's server insert is ON CONFLICT DO NOTHING, so a missed
-- id check in createWorkspace turns into an owner row in someone else's workspace. Two rules:
--   1. A home workspace (group id = user id) has one member, its user. The 'user_' prefix covers a
--      home whose user row doesn't exist yet.
--   2. An owner row may only be inserted into a live group with no other members, i.e. by the
--      group's creator. Later owners are promotions (UPDATE), and invites insert members.
--      Same-user rows pass so concurrent first sign-ins still hit ON CONFLICT DO NOTHING.
-- Idempotent, so it can be applied by hand ahead of the deploy.
CREATE OR REPLACE FUNCTION public.reject_workspace_takeover() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."groupId" <> NEW."userId" AND (
    NEW."groupId" LIKE 'user\_%'
    OR EXISTS (SELECT 1 FROM public."user" WHERE "id" = NEW."groupId")
  ) THEN
    RAISE EXCEPTION 'cannot add % to home workspace %', NEW."userId", NEW."groupId"
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."role" = 'owner' AND (
    NOT EXISTS (SELECT 1 FROM public."group" WHERE "id" = NEW."groupId" AND NOT "isDeleted")
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
