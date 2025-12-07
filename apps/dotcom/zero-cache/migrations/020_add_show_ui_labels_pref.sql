-- Purpose: Add a showUiLabels column to the user table that indicates whether the user
-- wants UI labels displayed. 3 possible values:
-- - true: the user wants UI labels shown
-- - false: the user does not want UI labels shown
-- - null: the user has not yet set the preference

ALTER TABLE "user"
ADD COLUMN "showUiLabels" BOOLEAN DEFAULT NULL; 