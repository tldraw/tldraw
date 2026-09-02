-- The home/private workspace (group id == user id) is now renameable like any
-- other workspace. Previously its name was forced to mirror the user's profile
-- name via triggers; that fought renames and meant the workspace had no name of
-- its own. Stop syncing the name and default it to "My workspace".

-- 1. Stop re-syncing the home group name to the user's profile name. This trigger
--    would clobber a user's custom workspace name whenever their profile changed.
DROP TRIGGER IF EXISTS "update_home_group_name_trigger" ON public."user";
DROP FUNCTION IF EXISTS update_home_group_name();

-- 2. Default new home groups to "My workspace" instead of the user's name. Keep the
--    creation trigger (it also covers the legacy migrate-to-groups path) but have
--    it set a fixed default rather than copying the user's name.
CREATE OR REPLACE FUNCTION initialize_home_group_name() RETURNS TRIGGER AS $$
BEGIN
  -- Only home groups have an id matching a user id.
  UPDATE "group"
  SET "name" = 'My workspace'
  FROM public."user" u
  WHERE u."id" = NEW."id" AND "group"."id" = NEW."id";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Reset existing home group names to "My workspace". Before this migration,
--    home group names were generated from profile names, so no existing name is
--    an intentional workspace-name choice.
UPDATE "group" SET "name" = 'My workspace' WHERE "id" IN (SELECT "id" FROM public."user");
