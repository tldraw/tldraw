import { atom } from '@tldraw/editor'

/**
 * Where a comment is anchored. Modeled as a discriminated union so new anchor kinds (page, point,
 * whole-document, text-range) can be added later without breaking existing comments. v1 supports
 * shapes.
 *
 * @public
 */
export interface TLCommentAnchor {
	type: 'shape'
	/** The id of the shape the comment is attached to. */
	shapeId: string
}

/**
 * A single comment. Unlike shapes, comments are **not** tldraw records and never enter the editor's
 * store — they live in whatever backend you pass to `<Tldraw comments={...} />`. That is what keeps
 * them off the undo/redo stack and out of the synced document.
 *
 * v1 is flat (no threads or replies) and plaintext.
 *
 * @public
 */
export interface TLComment {
	id: string
	anchor: TLCommentAnchor
	/** The id of the user who wrote the comment. */
	authorId: string
	/** Optional display info for the author, used when rendering pins and threads. */
	author?: { name: string; avatarUrl?: string }
	text: string
	createdAt: number
	updatedAt: number
}

/**
 * Input for creating a comment from the built-in UI. The author, id, and timestamps are assigned by
 * your backend (in the `onCreateComment` handler), so they are not part of the input.
 *
 * @public
 */
export interface TLCommentCreate {
	anchor: TLCommentAnchor
	text: string
}

/**
 * The fields that can change when a comment is edited. Used by the `onUpdateComment` handler.
 *
 * @public
 */
export interface TLCommentUpdate {
	text: string
}

/**
 * tldraw's internal, atom-backed view of the comments on the open document. Built from the
 * `comments` prop on `<Tldraw>`; not part of the public surface.
 *
 * @internal
 */
export interface TLCommentStore {
	/** The current comments. Reactive when read inside a tracking context (e.g. {@link useComments}). */
	get(): TLComment[]
	/** Replace the whole list — the simplest way to keep the store in step with your backend. */
	set(comments: TLComment[]): void
	/** Insert a comment. Ignored if one with the same id already exists. */
	add(comment: TLComment): void
	/** Insert a comment, or replace the existing one with the same id. */
	upsert(comment: TLComment): void
	/** Remove the comment with the given id. */
	delete(id: string): void
	/** Remove all comments. */
	clear(): void
}

/**
 * Internal carrier for the comment write handlers, associated with a {@link TLCommentStore}.
 *
 * @internal
 */
export interface TLCommentStoreOptions {
	onCreate?(input: TLCommentCreate): void | Promise<void>
	onUpdate?(id: string, changes: TLCommentUpdate): void | Promise<void>
	onDelete?(id: string): void | Promise<void>
}

// The write handlers are associated with a store here rather than stored on the object, so the
// public TLCommentStore interface stays purely about data.
const storeOptions = new WeakMap<TLCommentStore, TLCommentStoreOptions>()

/** @internal */
export function getCommentStoreOptions(store: TLCommentStore): TLCommentStoreOptions {
	return storeOptions.get(store) ?? {}
}

/** @internal */
export function createCommentStore(options: TLCommentStoreOptions = {}): TLCommentStore {
	const comments$ = atom<TLComment[]>('comments', [])
	const store: TLCommentStore = {
		get: () => comments$.get(),
		set: (comments) => comments$.set(comments),
		add: (comment) =>
			comments$.update((cs) => (cs.some((c) => c.id === comment.id) ? cs : [...cs, comment])),
		upsert: (comment) =>
			comments$.update((cs) => {
				const index = cs.findIndex((c) => c.id === comment.id)
				if (index === -1) return [...cs, comment]
				const next = cs.slice()
				next[index] = comment
				return next
			}),
		delete: (id) => comments$.update((cs) => cs.filter((c) => c.id !== id)),
		clear: () => comments$.set([]),
	}
	storeOptions.set(store, options)
	return store
}
