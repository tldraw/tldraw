import { Signal, TLShapeId, computed } from '@tldraw/editor'

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

/**
 * The pieces needed to build a {@link TLCommentStore} — a reactive read plus create/delete. Pass
 * plain functions; you don't have to manage signals or object identity yourself.
 *
 * @public
 */
export interface TLCommentStoreConfig {
	/**
	 * Return the document's comments. Read your reactive sources (signals, `editor` state, a
	 * query result) directly inside this function — {@link createCommentStore} wraps it in a
	 * computed, so the pins re-render whenever those sources change.
	 */
	getComments(): TLComment[]
	create(input: TLCommentCreate): Promise<void> | void
	delete(id: string): Promise<void> | void
}

/**
 * Build a {@link TLCommentStore} from plain functions, so you don't have to implement the interface
 * (or manage the reactive signal) by hand. Call it once for a given document — e.g. inside a
 * `useMemo` keyed on whatever your `getComments` reads (the document/file id) — and pass the result
 * to `<Tldraw comments={...} />`.
 *
 * @example
 * ```tsx
 * const comments = useMemo(
 *   () =>
 *     createCommentStore({
 *       getComments: () => backend.getComments(fileId),
 *       create: ({ anchor, text }) => backend.add(fileId, anchor, text),
 *       delete: (id) => backend.remove(id),
 *     }),
 *   [fileId]
 * )
 *
 * <Tldraw comments={comments} />
 * ```
 *
 * @public
 */
export function createCommentStore(config: TLCommentStoreConfig): TLCommentStore {
	const comments$ = computed('document comments', () => config.getComments())
	return {
		getCommentsForDocument: () => comments$,
		create: async (input) => {
			await config.create(input)
		},
		delete: async (id) => {
			await config.delete(id)
		},
	}
}
