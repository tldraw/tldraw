import { RoomSnapshot } from '@tldraw/sync-core'
import { inlineContentFromMessage, WelcomeRichText } from './welcomeMarkup'

/** A locale's baked welcome copy: the localized lokalise message per copy shape, by shape id. The
 *  message (e.g. `Entfernen`, or `<mark><strong>…</strong></mark>`) is stored — not a full richText
 *  doc — to keep the bundled artifact small; the worker rebuilds the doc here at seed time. */
export type WelcomeCopyByShapeId = Record<string, string>

/** Rebuild a shape's richText from its own doc (the template) with localized inline content. */
function localizeRichText(template: WelcomeRichText, message: string): WelcomeRichText {
	const [paragraph] = template.content
	return { ...template, content: [{ ...paragraph, content: inlineContentFromMessage(message) }] }
}

/**
 * Return a copy of `snapshot` with each shape in `byShapeId` given its localized copy. Only the
 * mapped shapes change — the comic's art, layout, and in-world flavor text are untouched. The
 * localized richText is rebuilt from each shape's own doc (keeping its structure/attrs) plus the
 * baked message — a cheap, deterministic operation with no catalog or network. The expensive part
 * (resolving translations) happened at build time; this is just string → doc assembly.
 *
 * A shape id in `byShapeId` that isn't in the snapshot, or a shape without single-paragraph richText,
 * is skipped; the build step asserts the ids exist and the copy shapes are single-paragraph.
 */
export function injectWelcomeCopy(
	snapshot: RoomSnapshot,
	byShapeId: WelcomeCopyByShapeId
): RoomSnapshot {
	const documents = snapshot.documents.map((doc) => {
		const state = doc.state as {
			id?: string
			props?: { richText?: WelcomeRichText } & Record<string, unknown>
		}
		const message = state.id ? byShapeId[state.id] : undefined
		const template = state.props?.richText
		if (message === undefined || template?.content.length !== 1) return doc
		// `state` is an opaque record (a shape); we only swap its richText prop, so cast back to the
		// record type rather than widening the documents array to a structural object.
		return {
			...doc,
			state: {
				...state,
				props: { ...state.props, richText: localizeRichText(template, message) },
			} as unknown as typeof doc.state,
		}
	})
	return { ...snapshot, documents }
}
