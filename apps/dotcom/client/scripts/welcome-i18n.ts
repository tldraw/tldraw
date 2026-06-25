import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { defaultWelcomeSnapshotJson } from '../../sync-worker/src/welcome/defaultWelcomeSnapshot'
import { WELCOME_COPY } from '../../sync-worker/src/welcome/welcomeCopy'
import {
	inlineContentFromMessage,
	messageFromRichText,
	WelcomeRichText,
} from '../../sync-worker/src/welcome/welcomeMarkup'

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

/**
 * Resolve each manifest entry to the snapshot shape carrying its English, asserting a unique match.
 * Returns the message id, its shape id, and that shape's richText (the template the bake clones).
 */
function resolveCopyShapes() {
	const snapshot = JSON.parse(defaultWelcomeSnapshotJson)
	// English -> the ids of every text shape whose serialized richText equals it. A list, so a
	// non-unique match becomes a reported error rather than a silently-picked shape.
	const idsByEnglish = new Map<string, string[]>()
	for (const { state } of snapshot.documents as ShapeDoc[]) {
		if (state?.type !== 'text' || !state.props?.richText || !state.id) continue
		const english = messageFromRichText(state.props.richText)
		idsByEnglish.set(english, [...(idsByEnglish.get(english) ?? []), state.id])
	}
	const shapesById = new Map<string, WelcomeRichText>()
	for (const { state } of snapshot.documents as ShapeDoc[]) {
		if (state?.id && state.props?.richText) shapesById.set(state.id, state.props.richText)
	}

	return WELCOME_COPY.map((entry) => {
		const matches = idsByEnglish.get(entry.en) ?? []
		if (matches.length !== 1) {
			throw new Error(
				`welcome copy ${entry.id}: expected exactly one snapshot shape with text ` +
					`${JSON.stringify(entry.en)}, found ${matches.length}. The manifest (welcomeCopy.ts) ` +
					`has drifted from the default snapshot — update one to match the other.`
			)
		}
		return {
			id: entry.id,
			en: entry.en,
			shapeId: matches[0],
			template: shapesById.get(matches[0])!,
		}
	})
}

type ResolvedCopy = ReturnType<typeof resolveCopyShapes>

/** Step 1: write the welcome English into the lokalise source catalog, keyed by message id. */
function extractEnglish() {
	const catalog: LokaliseCatalog = JSON.parse(readFileSync(EN_CATALOG, 'utf-8'))
	for (const entry of WELCOME_COPY) catalog[entry.id] = { translation: entry.en }
	// Match formatjs's lokalise output: keys sorted ascending, 2-space indent, trailing newline.
	const sorted: LokaliseCatalog = {}
	for (const key of Object.keys(catalog).sort()) sorted[key] = catalog[key]
	writeFileSync(EN_CATALOG, JSON.stringify(sorted, null, 2) + '\n')
	nicelog(`welcome i18n: wrote ${WELCOME_COPY.length} English strings into en.json`)
}

/** Localize one shape by templating off its English doc and swapping the paragraph content. */
function localizeRichText(template: WelcomeRichText, message: string): WelcomeRichText {
	if (template.content.length !== 1) {
		throw new Error(`welcome copy shapes must be single-paragraph; got ${template.content.length}`)
	}
	const [paragraph] = template.content
	return { ...template, content: [{ ...paragraph, content: inlineContentFromMessage(message) }] }
}

/** Step 2: bake the per-locale copy tables for every locale that has welcome translations. */
function bakeVariants(resolved: ResolvedCopy) {
	const locales = readdirSync(LOCALES_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace(/\.json$/, ''))
		.filter((locale) => !locale.startsWith('en'))
		.sort()

	const artifact: Record<string, Record<string, WelcomeRichText>> = {}
	for (const locale of locales) {
		const catalog: LokaliseCatalog = JSON.parse(
			readFileSync(join(LOCALES_DIR, `${locale}.json`), 'utf-8')
		)
		const table: Record<string, WelcomeRichText> = {}
		for (const { id, en, shapeId, template } of resolved) {
			const translation = catalog[id]?.translation
			// Skip untranslated strings (and translations identical to English) so the artifact only
			// carries genuinely localized copy; the worker leaves those shapes as the baked English.
			if (!translation || translation === en) continue
			table[shapeId] = localizeRichText(template, translation)
		}
		if (Object.keys(table).length > 0) {
			artifact[locale] = Object.fromEntries(
				Object.entries(table).sort(([a], [b]) => a.localeCompare(b))
			)
		}
	}
	return artifact
}

function writeArtifact(artifact: Record<string, Record<string, WelcomeRichText>>) {
	// Emit as data (.json), not a .ts module: like the compiled locale catalogs it is generated and
	// committed, and JSON keeps the formatter (which would rewrite a regenerated .ts every build) out
	// of it. The typed entry point is the hand-written localizedWelcomeCopy.ts wrapper. 2-space indent
	// matches the lokalise catalogs.
	writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + '\n')
	nicelog(`welcome i18n: baked variants for ${Object.keys(artifact).length} locale(s)`)
}

const resolved = resolveCopyShapes()
extractEnglish()
writeArtifact(bakeVariants(resolved))
