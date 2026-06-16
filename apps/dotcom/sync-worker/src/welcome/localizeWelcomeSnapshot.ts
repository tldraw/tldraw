import { RoomSnapshot } from '@tldraw/sync-core'

// SPIKE (jessica/welcome-i18n-spike): proving the "art baked, text dynamic" approach for the
// welcome document. The hand-drawn comic stays a frozen snapshot; only the instructional copy is
// rewritten from message keys at generation time. See the spike notes for the open delivery
// question (generate on the client with the user's intl, vs. pass a locale to the worker).

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
 * The welcome document's instructional copy, keyed by the stable shape id it lives in. Only these
 * shapes are localized; the comic's in-world flavor text (sticky-note labels, drawn file names) is
 * part of the illustration and left as drawn. Messages use `<strong>…</strong>` for the bold runs
 * the hand-drawn captions already use, so emphasis survives translation.
 */
export const WELCOME_COPY = {
	'shape:welcome-title': { id: 'welcome.title', defaultMessage: 'Welcome to your workspace' },
	'shape:welcome-caption-1': {
		id: 'welcome.caption1',
		defaultMessage:
			'A workspace is a <strong>shared space</strong> for your team. Everyone in it can see and edit its files.',
	},
	'shape:welcome-caption-2': {
		id: 'welcome.caption2',
		defaultMessage:
			'Invite your team with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too.',
	},
	'shape:welcome-caption-3': {
		id: 'welcome.caption3',
		defaultMessage:
			"Move files in by dragging them onto this workspace in the sidebar, or with a file's 'Move to' menu.",
	},
	'shape:welcome-team-label': { id: 'welcome.teamLabel', defaultMessage: 'your team' },
} as const

export type WelcomeCopyEntry = (typeof WELCOME_COPY)[keyof typeof WELCOME_COPY]
export type WelcomeCopyShapeId = keyof typeof WELCOME_COPY

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
		return {
			...doc,
			state: { ...state, props: { ...state.props, richText: richTextDoc(parts) } },
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
