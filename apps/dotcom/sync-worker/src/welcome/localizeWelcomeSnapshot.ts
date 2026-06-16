import { WELCOME_COPY } from '@tldraw/dotcom-shared'
import type { WelcomeCopyEntry } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'

// SPIKE (jessica/welcome-i18n-spike): proving the "art baked, text dynamic" approach for the
// welcome document. The hand-drawn comic stays a frozen snapshot; only the instructional copy is
// rewritten from message keys at generation time. The shapeId -> message binding lives in
// @tldraw/dotcom-shared (WELCOME_COPY) so the client and worker share the same stable ids.

// Re-export the shared binding so callers in this package keep a single import site.
export { WELCOME_COPY } from '@tldraw/dotcom-shared'
export type { WelcomeCopyEntry, WelcomeCopyShapeId } from '@tldraw/dotcom-shared'

/** A run of welcome copy: plain text, or text that should render bold. */
export type WelcomePart = string | { bold: string }

/** Build a one-paragraph tiptap richText doc from copy parts, preserving bold runs. */
function richTextDoc(parts: WelcomePart[]) {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				attrs: { dir: 'auto' },
				content: parts
					.filter((p) => (typeof p === 'string' ? p.length > 0 : p.bold.length > 0))
					.map((p) =>
						typeof p === 'string'
							? { type: 'text', text: p }
							: { type: 'text', text: p.bold, marks: [{ type: 'bold' }] }
					),
			},
		],
	}
}

/**
 * The injection half: return a copy of the snapshot with the given text shapes' richText replaced
 * by the provided parts (plain + bold runs). Only the mapped shapes change — art and layout are
 * untouched. Pure and locale-agnostic: the caller decides where `partsById` comes from (the user's
 * intl on the client, or a compiled locale catalog wherever variants are generated). This is the
 * shared plug point both the default-localization and the per-locale-variant paths end at.
 */
export function applyWelcomeText(
	snapshot: RoomSnapshot,
	partsById: Map<string, WelcomePart[]>
): RoomSnapshot {
	const documents = snapshot.documents.map((doc) => {
		const state = doc.state as { id?: string; props?: Record<string, unknown> }
		const parts = state.id ? partsById.get(state.id) : undefined
		if (!parts) return doc
		// `state` is an opaque record (shape); we only swap its richText prop, so cast back to the
		// record type rather than widening the documents array to a structural object.
		return {
			...doc,
			state: {
				...state,
				props: { ...state.props, richText: richTextDoc(parts) },
			} as unknown as typeof doc.state,
		}
	})
	return { ...snapshot, documents }
}

/**
 * Convenience over {@link applyWelcomeText} for the fixed welcome copy: rewrite every shape in
 * {@link WELCOME_COPY} using `format`, which turns a copy entry into localized parts.
 *
 * The react-intl call site looks like:
 *   format = (entry) => intl.formatMessage(entry, { strong: (chunks) => ({ bold: chunks.join('') }) })
 * which returns the `(string | { bold })[]` this expects.
 */
export function localizeWelcomeSnapshot(
	snapshot: RoomSnapshot,
	format: (entry: WelcomeCopyEntry) => WelcomePart[]
): RoomSnapshot {
	const partsById = new Map<string, WelcomePart[]>(
		Object.entries(WELCOME_COPY).map(([shapeId, entry]) => [shapeId, format(entry)])
	)
	return applyWelcomeText(snapshot, partsById)
}
