-- Denormalize each member's avatar onto their group_user row, beside userName and userColor (023),
-- so a workspace's members can be shown with their avatars: joining "user" from the
-- workspaceMemberships query would expose private user fields to every member.

ALTER TABLE public."group_user" ADD COLUMN "userAvatar" TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION update_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = NEW.name,
      "userColor" = COALESCE(NEW.color, '#000000'),
      "userAvatar" = COALESCE(NEW.avatar, '')
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = u."name",
      "userColor" = COALESCE(u."color", '#000000'),
      "userAvatar" = COALESCE(u."avatar", '')
  FROM public."user" u
  WHERE u."id" = NEW."userId" AND "group_user"."userId" = NEW."userId" AND "group_user"."groupId" = NEW."groupId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER "update_group_user_details_trigger" ON public."user";

CREATE TRIGGER "update_group_user_details_trigger"
AFTER UPDATE OF "name", "color", "avatar" ON public."user"
FOR EACH ROW
WHEN (
  OLD."name" IS DISTINCT FROM NEW."name"
  OR OLD."color" IS DISTINCT FROM NEW."color"
  OR OLD."avatar" IS DISTINCT FROM NEW."avatar"
)
EXECUTE FUNCTION update_group_user_details();

-- Backfill rows that predate the column.
UPDATE public."group_user" gu
SET "userAvatar" = u."avatar"
FROM public."user" u
WHERE u."id" = gu."userId";
