import { Environment } from '../types'
import { WelcomeCatalog } from './welcomeVariants'

/** Locale lookup order: 'fr-FR' → ['fr-FR', 'fr']; 'en' → ['en']. */
export function localeCandidates(locale: string): string[] {
	const base = locale.split('-')[0]
	return base && base !== locale ? [locale, base] : [locale]
}

/**
 * Fetch a locale's welcome copy from the same lokalise catalogs the dotcom client serves
 * (`/tla/locales/<locale>.json`), so translations stay a single source of truth. Returns undefined
 * when no app origin is configured or there's no catalog for the locale — the caller then falls
 * back to the source-language template or the committed English default.
 */
export async function loadWelcomeCatalog(
	env: Environment,
	locale: string
): Promise<WelcomeCatalog | undefined> {
	const origin = env.APP_ORIGIN
	if (!origin) return undefined
	for (const candidate of localeCandidates(locale)) {
		const res = await fetch(`${origin}/tla/locales/${candidate}.json`)
		if (!res.ok) continue
		const lokalise = (await res.json()) as Record<string, { translation?: string }>
		const catalog: WelcomeCatalog = {}
		for (const [id, entry] of Object.entries(lokalise)) {
			if (entry?.translation) catalog[id] = entry.translation
		}
		return catalog
	}
	return undefined
}
