import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { defaultWelcomeSnapshotJson } from '../../sync-worker/src/welcome/defaultWelcomeSnapshot'
import { WELCOME_COPY } from '../../sync-worker/src/welcome/welcomeCopy'
import { messageFromRichText, WelcomeRichText } from '../../sync-worker/src/welcome/welcomeMarkup'

// The welcome i18n build step. It replaces what #9237 did at runtime in the sync worker (fetch the
// translation catalogs over HTTP and fill the copy shapes per request) with a step that resolves
// every translation ahead of time, the same way dotcom already compiles its UI strings:
//
//   1. extract — derive each welcome string's English straight from the committed default snapshot
//      and write it into the lokalise source catalog (public/tla/locales/en.json), so translators
//      localize exactly what is baked into the art. The snapshot is the single source of English.
//   2. bake — for every locale that has welcome translations, produce the localized richText for each
//      copy shape and emit it as a committed artifact the worker bundles and looks up at seed time.
//
// Runs as a step of `build-i18n` (after `i18n:extract`, before `i18n:compile`). The welcome copy is
// never rendered through react-intl — it lives inside a document snapshot — so unlike normal UI
// strings there is no runtime formatting: the build is the translation.

const LOCALES_DIR = join(__dirname, '../public/tla/locales')
const EN_CATALOG = join(LOCALES_DIR, 'en.json')
const ARTIFACT = join(__dirname, '../../sync-worker/src/welcome/localizedWelcomeCopy.json')

type LokaliseCatalog = Record<string, { translation?: string }>
interface ShapeDoc {
	state: { id?: string; type?: string; props?: { richText?: WelcomeRichText } }
}

/** English -> the app's existing lokalise message id, built from the non-`welcome.*` catalog keys. */
function buildAppIdIndex(): Map<string, string> {
	const catalog: LokaliseCatalog = JSON.parse(readFileSync(EN_CATALOG, 'utf-8'))
	const byEnglish = new Map<string, string>()
	for (const [id, entry] of Object.entries(catalog)) {
		if (id.startsWith('welcome.') || !entry?.translation) continue
		byEnglish.set(entry.translation, id)
	}
	return byEnglish
}

/**
 * Resolve each manifest entry to: its lokalise message id (`welcome.*` when owned, else the app's
 * existing id matched by English — see WelcomeCopyEntry), and the ids of the snapshot shape(s)
 * carrying its English (asserting at least one match; a string can appear on several shapes). A
 * shared entry whose English is no longer a live app string is an error.
 */
function resolveCopyShapes(appIds: Map<string, string>) {
	const snapshot = JSON.parse(defaultWelcomeSnapshotJson)
	// English -> the ids of every text shape whose serialized richText equals it.
	const idsByEnglish = new Map<string, string[]>()
	for (const { state } of snapshot.documents as ShapeDoc[]) {
		if (state?.type !== 'text' || !state.props?.richText || !state.id) continue
		const english = messageFromRichText(state.props.richText)
		idsByEnglish.set(english, [...(idsByEnglish.get(english) ?? []), state.id])
	}

	return WELCOME_COPY.map((entry) => {
		const messageId = entry.id ?? appIds.get(entry.en)
		if (!messageId) {
			throw new Error(
				`welcome copy ${JSON.stringify(entry.en)} is shared (no welcome id) but no app message ` +
					`has that English — it is not (or no longer) a live app string. Give it a welcome.* id, or fix the text.`
			)
		}
		const shapeIds = idsByEnglish.get(entry.en) ?? []
		if (shapeIds.length === 0) {
			throw new Error(
				`welcome copy ${messageId}: no snapshot shape has text ${JSON.stringify(entry.en)}. ` +
					`The manifest (welcomeCopy.ts) has drifted from the default snapshot — update one to match the other.`
			)
		}
		return { messageId, en: entry.en, shapeIds }
	})
}

type ResolvedCopy = ReturnType<typeof resolveCopyShapes>

/** Step 1: write the OWNED welcome English into the lokalise source catalog, keyed by `welcome.*` id.
 *  Shared entries are skipped — their English is already in the catalog under the app's own id. */
function extractEnglish() {
	const catalog: LokaliseCatalog = JSON.parse(readFileSync(EN_CATALOG, 'utf-8'))
	const owned = WELCOME_COPY.filter((entry) => entry.id !== undefined)
	for (const entry of owned) catalog[entry.id!] = { translation: entry.en }
	// Match formatjs's lokalise output: keys sorted ascending, 2-space indent, trailing newline.
	const sorted: LokaliseCatalog = {}
	for (const key of Object.keys(catalog).sort()) sorted[key] = catalog[key]
	writeFileSync(EN_CATALOG, JSON.stringify(sorted, null, 2) + '\n')
	nicelog(`welcome i18n: wrote ${owned.length} owned English strings into en.json`)
}

/** Step 2: bake the per-locale copy tables — shapeId -> localized message string — for every locale
 *  that has welcome translations. The worker rebuilds the richText from the message (see
 *  injectWelcomeCopy); storing the message, not the assembled doc, keeps the bundled artifact small. */
function bakeVariants(resolved: ResolvedCopy) {
	const locales = readdirSync(LOCALES_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace(/\.json$/, ''))
		.filter((locale) => !locale.startsWith('en'))
		.sort()

	const artifact: Record<string, Record<string, string>> = {}
	for (const locale of locales) {
		const catalog: LokaliseCatalog = JSON.parse(
			readFileSync(join(LOCALES_DIR, `${locale}.json`), 'utf-8')
		)
		const table: Record<string, string> = {}
		for (const { messageId, en, shapeIds } of resolved) {
			const translation = catalog[messageId]?.translation
			// Skip untranslated strings (and translations identical to English) so the artifact only
			// carries genuinely localized copy; the worker leaves those shapes as the baked English.
			if (!translation || translation === en) continue
			// Store the message against every shape carrying this string.
			for (const shapeId of shapeIds) table[shapeId] = translation
		}
		if (Object.keys(table).length > 0) {
			artifact[locale] = Object.fromEntries(
				Object.entries(table).sort(([a], [b]) => a.localeCompare(b))
			)
		}
	}
	return artifact
}

function writeArtifact(artifact: Record<string, Record<string, string>>) {
	// Emit as data (.json), not a .ts module: like the compiled locale catalogs it is generated and
	// committed, and JSON keeps the formatter (which would rewrite a regenerated .ts every build) out
	// of it. The typed entry point is the hand-written localizedWelcomeCopy.ts wrapper. 2-space indent
	// matches the lokalise catalogs.
	writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + '\n')
	nicelog(`welcome i18n: baked variants for ${Object.keys(artifact).length} locale(s)`)
}

// Runs after formatjs `i18n:extract`, so en.json already holds the app's strings (the shared
// entries bind to those by English).
const resolved = resolveCopyShapes(buildAppIdIndex())
extractEnglish()
writeArtifact(bakeVariants(resolved))
