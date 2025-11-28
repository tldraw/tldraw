ALTER TABLE fairy_invite
ADD COLUMN description TEXT,
ADD COLUMN "redeemedBy" JSONB DEFAULT '[]'::jsonb;
