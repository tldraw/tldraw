import { RoomSnapshot } from '@tldraw/sync-core'
import { WelcomeRichText } from './welcomeMarkup'

/** A locale's baked welcome copy: the localized richText to set on each copy shape, by shape id. */
export type WelcomeCopyByShapeId = Record<string, WelcomeRichText>

/**
 * Return a copy of `snapshot` with each shape in `byShapeId` given its localized richText. Only the
 * mapped shapes change — the comic's art, layout, and in-world flavor text are untouched. Pure and
 * locale-agnostic: the localized docs are produced at build time (see the welcome i18n bake), so at
 * seed time this is a deterministic prop swap with no catalog, parsing, or network.
 *
 * A shape id in `byShapeId` that isn't in the snapshot is ignored here; the build step is where that
 * mismatch is asserted, so by the time a baked table reaches the worker its ids are known to exist.
 */
export function injectWelcomeCopy(
	snapshot: RoomSnapshot,
	byShapeId: WelcomeCopyByShapeId
): RoomSnapshot {
	const documents = snapshot.documents.map((doc) => {
		const state = doc.state as { id?: string; props?: Record<string, unknown> }
		const richText = state.id ? byShapeId[state.id] : undefined
		if (!richText) return doc
		// `state` is an opaque record (a shape); we only swap its richText prop, so cast back to the
		// record type rather than widening the documents array to a structural object.
		return {
			...doc,
			state: {
				...state,
				props: { ...state.props, richText },
			} as unknown as typeof doc.state,
		}
	})
	return { ...snapshot, documents }
}
