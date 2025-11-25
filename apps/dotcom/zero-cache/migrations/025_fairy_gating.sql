-- Add fairy access control columns to user_fairies table
ALTER TABLE user_fairies
ADD COLUMN "fairyLimit" INTEGER,
ADD COLUMN "fairyAccessExpiresAt" BIGINT;

-- Create fairy invite table
CREATE TABLE fairy_invite (
  id VARCHAR PRIMARY KEY,
  "fairyLimit" INTEGER NOT NULL,
  "maxUses" INTEGER NOT NULL,
  "currentUses" INTEGER NOT NULL DEFAULT 0,
  "createdAt" BIGINT NOT NULL
);
