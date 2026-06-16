-- Records which locales currently have a generated welcome variant (welcome-variants/<slug>/<locale>
-- in R2), written by the variant-generation queue job after a template is set, and reset when the
-- template is (re)set. Surfaced in the admin UI so it's clear which locales are localized. The seed
-- path reads the R2 variants directly and falls back per-locale regardless, so this is observability,
-- not a gate. Like the rest of welcome_template it is outside the Zero publication.
ALTER TABLE welcome_template ADD COLUMN IF NOT EXISTS locales TEXT[] NOT NULL DEFAULT '{}';
