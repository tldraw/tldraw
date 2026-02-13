-- Purpose: Renames showUiLabels column to enhancedA11yMode column in the user table

ALTER TABLE "user"
RENAME COLUMN "showUiLabels" TO "enhancedA11yMode"; 