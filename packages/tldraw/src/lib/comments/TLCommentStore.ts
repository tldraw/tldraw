import { Signal, TLShapeId } from '@tldraw/editor'

/**
 * Where a comment is anchored. Modeled as a discriminated union so new anchor kinds (page, point,
 * whole-document, text-range) can be added later without breaking existing comments. v1 supports
 * shapes.
 *
 * @public
 */
export interface TLCommentAnchor {
	type: 'shape'
	shapeId: TLShapeId
}

/**
 * A single comment. Unlike shapes, comments are **not** tldraw records and never enter the editor's
 * store — they live in whatever backend a {@link TLCommentStore} wraps. That is what keeps them off
 * the undo/redo stack and out of the synced document.
 *
 * v1 is flat (no threads or replies) and plaintext.
 *
 * @public
 */
export interface TLComment {
	id: string
	anchor: TLCommentAnchor
	/** The id of the user who wrote the comment. For a server-backed store this is set server-side. */
	authorId: string
	/** Optional display info for the author, used when rendering pins and threads. */
	author?: { name: string; avatarUrl?: string }
	text: string
	createdAt: number
	updatedAt: number
}

/**
 * Input for creating a comment. The author and timestamps are assigned by the store (and, for a
 * server-backed store, enforced server-side), so they are not part of the input.
 *
 * @public
 */
export interface TLCommentCreate {
	anchor: TLCommentAnchor
	text: string
}

/**
 * A pluggable source of comments. Implement this against your own backend and pass it to
 * `<Tldraw comments={...} />`; the SDK renders the pins and composer against it. Comment data lives
 * entirely behind this interface — it never enters the tldraw store, so it does not sync with the
 * document and is unaffected by undo/redo.
 *
 * Reads are reactive: return `@tldraw/state` signals so the UI re-renders as comments change.
 * `getCommentsForDocument` should return a stable signal (memoize it) rather than a fresh one per
 * call.
 *
 * @example
 * ```tsx
 * const store: TLCommentStore = {
 *   getCommentsForDocument: () => commentsSignal,
 *   create: async ({ anchor, text }) => myBackend.insert(anchor, text),
 *   delete: async (id) => myBackend.remove(id),
 * }
 *
 * <Tldraw comments={store} />
 * ```
 *
 * @public
 */
export interface TLCommentStore {
	/** A reactive list of every comment on the open document. */
	getCommentsForDocument(): Signal<TLComment[]>
	/**
	 * Create a comment. Resolves once the write is accepted; an optimistic store may update its
	 * reactive list before this resolves.
	 */
	create(input: TLCommentCreate): Promise<void>
	/** Delete a comment by id. */
	delete(id: string): Promise<void>
}
