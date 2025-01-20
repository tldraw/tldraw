-- Purpose: Add an allowAnalyticsCookie column to the user table that indicates whether the user has
-- consented to analytics cookies. 3 possible values:
-- - true: the user has consented to analytics cookies
-- - false: the user has not consented to analytics cookies
-- - null: the user has not yet been asked to consent to analytics cookies

ALTER TABLE "user"
ADD COLUMN "allowAnalyticsCookie" BOOLEAN DEFAULT NULL;
