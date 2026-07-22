-- Retire the admin-set welcome template (migration 035). New workspaces now always seed from the
-- committed default welcome snapshot, localized at build time, so the worker no longer reads this
-- pointer and nothing writes it. Drop the now-unused table.
DROP TABLE IF EXISTS welcome_template;
