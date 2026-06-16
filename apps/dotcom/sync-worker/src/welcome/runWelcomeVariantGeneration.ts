import { WELCOME_COPY } from '@tldraw/dotcom-shared'
import { getPublishedRoomSnapshot } from '../routes/tla/getPublishedFile'
import { Environment } from '../types'
import { loadWelcomeCatalog } from './loadWelcomeCatalog'
import { generateWelcomeVariants, welcomeVariantR2Key } from './welcomeVariants'

// Locales we generate welcome variants for. Should track the dotcom client's supported locales
// (apps/dotcom/client/public/tla/locales) — ideally generated from that list rather than hand-kept.
// English is omitted: the committed default's baked text is already English.
export const WELCOME_TARGET_LOCALES = [
	'ar',
	'bn',
	'ca',
	'cs',
	'da',
	'de',
	'el',
	'es',
	'fa',
	'fi',
	'fr',
	'gl',
	'gu-in',
	'he',
	'hi-in',
	'hr',
	'hu',
	'id',
	'it',
	'ja',
	'km-kh',
	'kn',
	'ko-kr',
	'ml',
	'mr',
	'ms',
	'ne',
	'nl',
	'no',
	'pa',
	'pl',
	'pt-br',
	'pt-pt',
	'ro',
	'ru',
	'sl',
	'so',
	'sv',
	'ta',
	'te',
	'th',
	'tl',
	'tr',
	'uk',
	'ur',
	'vi',
	'zh-cn',
	'zh-tw',
] as const

/** True when a catalog actually carries at least one welcome string (vs. an untranslated locale). */
function hasWelcomeTranslations(catalog: Record<string, string>): boolean {
	return Object.values(WELCOME_COPY).some((entry) => catalog[entry.id] !== undefined)
}

/**
 * Generate and store the per-locale welcome variants for a published template. Enqueued (via the
 * 'welcome-variant-generate' queue message) when the welcome template is set, and read back at seed
 * time by resolveWelcomeSnapshot. Binds the pure generator to the live catalog fetch + R2.
 *
 * Locales whose catalog has no welcome translations yet are skipped, so we don't store variants
 * identical to the English default; the seed path falls back for those until translations land.
 */
export async function runWelcomeVariantGeneration(
	env: Environment,
	publishedSlug: string
): Promise<string[]> {
	const source = await getPublishedRoomSnapshot(env, publishedSlug)
	if (!source) {
		throw new Error(`welcome template ${publishedSlug} has no published snapshot`)
	}
	return await generateWelcomeVariants({
		source,
		locales: WELCOME_TARGET_LOCALES,
		loadCatalog: async (locale) => {
			const catalog = await loadWelcomeCatalog(env, locale)
			return catalog && hasWelcomeTranslations(catalog) ? catalog : undefined
		},
		putVariant: async (locale, variant) => {
			await env.ROOM_SNAPSHOTS.put(
				welcomeVariantR2Key(publishedSlug, locale),
				JSON.stringify(variant)
			)
		},
		reportError: (locale, e) => console.error(`welcome variant generation failed for ${locale}`, e),
	})
}
