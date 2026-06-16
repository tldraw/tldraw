import { RoomSnapshot } from '@tldraw/sync-core'
import { createPostgresConnectionPool } from '../postgres'
import { getPublishedRoomSnapshot } from '../routes/tla/getPublishedFile'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { loadWelcomeCatalog, localeCandidates } from './loadWelcomeCatalog'
import { applyWelcomeText } from './localizeWelcomeSnapshot'
import { welcomePartsForCatalog, welcomeVariantR2Key } from './welcomeVariants'

export interface ResolveWelcomeOptions {
	/** The creating user's locale (e.g. 'fr' or 'fr-FR'). Omitted → the English source content. */
	locale?: string
	reportError?(e: unknown): void
}

/**
 * The content a new workspace's first file is seeded with (createSource 'welcome'), resolved in
 * the creator's `locale`. Fallback chain:
 *   1. a pre-generated per-locale variant of the marked template (R2), else
 *   2. the marked template's published snapshot in its source language, else
 *   3. the committed default, localized from the dotcom catalogs when possible, else its English.
 * Always resolves — the committed default guarantees a usable file.
 *
 * A template that is *set yet unreadable* (unpublished, missing R2, transient DB error) is a
 * misconfiguration, not the fresh-env no-template case, so it is reported via `reportError` while
 * still degrading. The no-template case is silent.
 */
export async function resolveWelcomeSnapshot(
	env: Environment,
	opts: ResolveWelcomeOptions = {}
): Promise<RoomSnapshot> {
	const { locale, reportError } = opts
	// Runs inside a Durable Object, so destroy the pool to avoid an idle connection holding the DO
	// awake (see TLPostgresPool in postgres.ts).
	const pg = createPostgresConnectionPool(env, 'resolveWelcomeSnapshot')
	try {
		const row = await pg.selectFrom('welcome_template').select('publishedSlug').executeTakeFirst()
		if (row?.publishedSlug) {
			const variant = locale ? await loadWelcomeVariant(env, row.publishedSlug, locale) : undefined
			if (variant) return variant
			const published = await getPublishedRoomSnapshot(env, row.publishedSlug)
			if (published) return published // source-language template; no variant for this locale yet
			// A template is configured but its published snapshot is gone — flag it, don't silently
			// serve the default as if nothing were set.
			reportError?.(new Error(`welcome template ${row.publishedSlug} has no published snapshot`))
		}
	} catch (e) {
		// A configured template that fails to load, or a DB error reading the pointer — report it;
		// only a genuinely-absent template should fall back silently.
		reportError?.(e)
	} finally {
		await pg.destroy()
	}
	return await resolveDefaultWelcomeSnapshot(env, locale, reportError)
}

/** A pre-generated per-locale variant of the marked template, if one exists in R2. */
async function loadWelcomeVariant(
	env: Environment,
	publishedSlug: string,
	locale: string
): Promise<RoomSnapshot | undefined> {
	for (const candidate of localeCandidates(locale)) {
		const obj = await env.ROOM_SNAPSHOTS.get(welcomeVariantR2Key(publishedSlug, candidate))
		if (obj) return (await obj.json()) as RoomSnapshot
	}
	return undefined
}

/** The committed default, localized into `locale` from the dotcom catalogs when possible. */
async function resolveDefaultWelcomeSnapshot(
	env: Environment,
	locale: string | undefined,
	reportError: ((e: unknown) => void) | undefined
): Promise<RoomSnapshot> {
	const base = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
	// The default's baked text is already English, so skip the catalog fetch for English locales.
	if (!locale || isEnglish(locale)) return base
	try {
		const catalog = await loadWelcomeCatalog(env, locale)
		if (catalog) return applyWelcomeText(base, welcomePartsForCatalog(catalog))
	} catch (e) {
		reportError?.(e)
	}
	return base
}

function isEnglish(locale: string): boolean {
	return locale === 'en' || locale.startsWith('en-')
}
