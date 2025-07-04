-- Purpose: Add an areKeyboardShortcutsEnabled column to the user table that indicates whether the user
-- wants keyboard shortcuts enabled. 3 possible values:
-- - true: the user wants keyboard shortcuts
-- - false: the user does not want keyboard shortcuts
-- - null: the user has not yet set the preference

ALTER TABLE "user"
ADD COLUMN "areKeyboardShortcutsEnabled" BOOLEAN DEFAULT NULL;
