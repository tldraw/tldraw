ALTER TABLE user_fairies
ADD COLUMN "weeklyUsage" JSONB DEFAULT '{}'::jsonb;
