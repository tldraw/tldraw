import data from './localizedWelcomeCopy.json'

/**
 * Per-locale localized welcome copy: the lokalise message to set on each welcome shape, keyed by
 * locale then shape id. The data lives in the generated `localizedWelcomeCopy.json` (produced by the
 * welcome i18n build step — see apps/dotcom/client/scripts/welcome-i18n.ts); this is just its typed
 * entry point. Messages (not full richText docs) are stored to keep the bundled artifact small; the
 * worker rebuilds the richText at seed time (see injectWelcomeCopy). Only locales with welcome
 * translations appear; everything else falls back to the baked English default in resolveWelcomeSnapshot.
 */
export const localizedWelcomeCopy = data as Record<string, Record<string, string>>
