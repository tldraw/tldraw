-- Replace userEmail with userColor in group_user table
ALTER TABLE "group_user" DROP COLUMN "userEmail";
ALTER TABLE "group_user" ADD COLUMN "userColor" TEXT NOT NULL DEFAULT '#000000';

-- Drop the old trigger that was updating userEmail
DROP TRIGGER IF EXISTS "update_group_user_details_trigger" ON public."user";
DROP TRIGGER IF EXISTS "set_group_user_details_trigger" ON "group_user";

-- Drop the old functions
DROP FUNCTION IF EXISTS update_group_user_details();
DROP FUNCTION IF EXISTS set_group_user_details();

-- Create new function to update group_user details when user name or color changes
CREATE OR REPLACE FUNCTION update_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = NEW.name,
      "userColor" = COALESCE(NEW.color, '#000000')
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new function to set group_user details when group_user is inserted or updated
CREATE OR REPLACE FUNCTION set_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = u."name",
      "userColor" = COALESCE(u."color", '#000000')
  FROM public."user" u
  WHERE u."id" = NEW."userId" AND "group_user"."userId" = NEW."userId" AND "group_user"."groupId" = NEW."groupId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger to update group_user details when user name or color is updated
CREATE TRIGGER "update_group_user_details_trigger"
AFTER UPDATE OF "name", "color" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."color" IS DISTINCT FROM NEW."color")
EXECUTE FUNCTION update_group_user_details();

-- Create new trigger to set group_user details when group_user is inserted or updated
CREATE TRIGGER "set_group_user_details_trigger"
AFTER INSERT OR UPDATE OF "userId" ON "group_user"
FOR EACH ROW
EXECUTE FUNCTION set_group_user_details();

-- Update existing group_user records to have a default color
UPDATE "group_user" 
SET "userColor" = COALESCE(
  (SELECT u."color" FROM public."user" u WHERE u."id" = "group_user"."userId"), 
  '#000000'
)
WHERE "userColor" = '#000000';
