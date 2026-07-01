import { RoomSnapshot } from '@tldraw/sync-core'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { injectWelcomeCopy } from './injectWelcomeCopy'
import { localizedWelcomeCopy } from './localizedWelcomeCopy'

/** Locale lookup order, lowercased to match the baked artifact's keys: 'pt-BR' → ['pt-br', 'pt']. */
export function welcomeLocaleCandidates(locale: string): string[] {
	const lower = locale.toLowerCase()
	const base = lower.split('-')[0]
	return base && base !== lower ? [lower, base] : [lower]
}

/**
 * The content a new workspace's first file is seeded with (createSource 'welcome'), in the creator's
 * `locale`. The art is the committed default snapshot; its instructional copy is localized by baking
 * — `localizedWelcomeCopy` holds the per-locale richText resolved at build time (see the welcome i18n
 * build step) — so this is a pure, synchronous lookup with no database, catalog fetch, or network.
 *
 * Falls back to the baked English default when `locale` is absent, English, or has no baked welcome
 * translations yet. Always resolves.
 */
export function resolveWelcomeSnapshot(locale?: string): RoomSnapshot {
	const base = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
	if (!locale) return base
	for (const candidate of welcomeLocaleCandidates(locale)) {
		const table = localizedWelcomeCopy[candidate]
		if (table) return injectWelcomeCopy(base, table)
	}
	return base
}
