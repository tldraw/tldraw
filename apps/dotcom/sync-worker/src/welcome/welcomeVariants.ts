import { RoomSnapshot } from '@tldraw/sync-core'
import { applyWelcomeText, WelcomePart, WELCOME_COPY } from './localizeWelcomeSnapshot'

// SPIKE SCAFFOLD (#9219): generate per-locale welcome snapshots from a source template by filling
// its known copy shapes from dotcom's compiled translation catalogs. Translation uses the SAME
// formatjs/lokalise messages as the rest of dotcom — so there is no machine translation and no
// arbitrary-text extraction: we only ever fill the fixed WELCOME_COPY shapes from a catalog.
//
// This module is deliberately locus-agnostic. `loadCatalog` and `putVariant` are injected so the
// generator can run wherever the catalogs live (see "Open: where this runs" in the dossier):
//   - on the worker, with the compiled catalogs bundled, or
//   - on the client at publish time, where dotcom i18n + the catalogs are already loaded.

/** A compiled locale catalog: formatjs message id -> translated message (may contain <strong>). */
export type WelcomeCatalog = Record<string, string>

/** Split a translated message into plain + bold parts, mirroring react-intl's <strong> chunks. */
function parseStrong(message: string): WelcomePart[] {
	return message
		.split(/<strong>(.*?)<\/strong>/g)
		.map((chunk, i) => (i % 2 === 1 ? { bold: chunk } : chunk))
		.filter((p) => (typeof p === 'string' ? p.length > 0 : true))
}

/**
 * Build the `shapeId -> parts` map for a locale by looking each welcome message up in `catalog`,
 * falling back to the source `defaultMessage` when the catalog is missing a key (untranslated).
 */
export function welcomePartsForCatalog(catalog: WelcomeCatalog): Map<string, WelcomePart[]> {
	return new Map(
		Object.entries(WELCOME_COPY).map(([shapeId, entry]) => [
			shapeId,
			parseStrong(catalog[entry.id] ?? entry.defaultMessage),
		])
	)
}

/** The localized snapshot for one locale: the source with its copy shapes filled from `catalog`. */
export function generateWelcomeVariant(
	source: RoomSnapshot,
	catalog: WelcomeCatalog
): RoomSnapshot {
	return applyWelcomeText(source, welcomePartsForCatalog(catalog))
}

/** Deterministic R2 key a generated variant is stored at and the seed path reads back from. */
export function welcomeVariantR2Key(sourcePublishedSlug: string, locale: string): string {
	return `welcome-variants/${sourcePublishedSlug}/${locale}`
}

/**
 * Generate a localized variant per locale and hand each to `putVariant`. Kicked off when the
 * welcome template is published/set (see the admin POST + queue wiring TODO). Returns the locales
 * that generated successfully, for recording on the welcome_template row.
 *
 * `loadCatalog`/`putVariant` are injected so this is testable and locus-agnostic; the production
 * wiring binds them to the compiled catalogs and `env.ROOM_SNAPSHOTS.put(welcomeVariantR2Key(...))`.
 */
export async function generateWelcomeVariants(opts: {
	source: RoomSnapshot
	locales: readonly string[]
	loadCatalog(locale: string): Promise<WelcomeCatalog | undefined>
	putVariant(locale: string, variant: RoomSnapshot): Promise<void>
	reportError?(locale: string, e: unknown): void
}): Promise<string[]> {
	const generated: string[] = []
	for (const locale of opts.locales) {
		try {
			const catalog = await opts.loadCatalog(locale)
			if (!catalog) continue // no catalog for this locale yet — seed falls back to source language
			await opts.putVariant(locale, generateWelcomeVariant(opts.source, catalog))
			generated.push(locale)
		} catch (e) {
			// one locale failing shouldn't sink the rest; seed falls back for the missing locale.
			opts.reportError?.(locale, e)
		}
	}
	return generated
}
