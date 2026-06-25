import data from './localizedWelcomeCopy.json'
import { WelcomeRichText } from './welcomeMarkup'

/**
 * Per-locale localized welcome copy: the richText to set on each welcome shape, keyed by locale then
 * shape id. The data lives in the generated `localizedWelcomeCopy.json` (produced by the welcome i18n
 * build step — see apps/dotcom/client/scripts/welcome-i18n.ts); this is just its typed entry point.
 * Only locales with welcome translations appear; everything else falls back to the baked English
 * default in resolveWelcomeSnapshot.
 */
export const localizedWelcomeCopy = data as Record<string, Record<string, WelcomeRichText>>
