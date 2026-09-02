-- Rename the non-owner group role from 'admin' to 'member'.
-- The 'admin' label was misleading: the role confers no admin-level
-- capabilities, it's a standard group member.

-- Drop the existing CHECK constraint. It was created as an inline column
-- constraint in 023_groups.sql, so Postgres auto-named it "group_user_role_check".
ALTER TABLE public."group_user" DROP CONSTRAINT IF EXISTS "group_user_role_check";

-- Rewrite existing rows to the new role value.
UPDATE public."group_user" SET "role" = 'member' WHERE "role" = 'admin';

-- Re-add the CHECK constraint with the new allowed values.
ALTER TABLE public."group_user" ADD CONSTRAINT "group_user_role_check" CHECK ("role" IN ('member', 'owner'));
