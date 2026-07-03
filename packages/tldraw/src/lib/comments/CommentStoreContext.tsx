import { useEvent, useValue } from '@tldraw/editor'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import {
	TLComment,
	TLCommentCreate,
	TLCommentStore,
	TLCommentStoreOptions,
	TLCommentUpdate,
	createCommentStore,
} from './TLCommentStore'

const CommentStoreContext = createContext<TLCommentStore | null>(null)

/** @internal */
export function CommentStoreProvider({
	store,
	children,
}: {
	store: TLCommentStore | null
	children: ReactNode
}) {
	return <CommentStoreContext.Provider value={store}>{children}</CommentStoreContext.Provider>
}

/** @internal reader used by the built-in comment UI */
export function useCommentStoreContext(): TLCommentStore | null {
	return useContext(CommentStoreContext)
}

/**
 * Build tldraw's internal comment store from the `comments` prop and write handlers. The store keeps
 * a stable identity across renders; the `comments` array is synced into it, and the handlers are
 * stabilized so unstable inline callbacks don't cause churn.
 *
 * @internal
 */
export function useInternalCommentStore(
	comments: TLComment[] | undefined,
	options: TLCommentStoreOptions
): TLCommentStore {
	const onCreate = useEvent((input: TLCommentCreate) => options.onCreate?.(input))
	const onUpdate = useEvent((id: string, changes: TLCommentUpdate) =>
		options.onUpdate?.(id, changes)
	)
	const onDelete = useEvent((id: string) => options.onDelete?.(id))
	const [store] = useState(() => {
		const created = createCommentStore({ onCreate, onUpdate, onDelete })
		// Seed synchronously so pins are there on first paint, not a frame later.
		if (comments) created.set(comments)
		return created
	})
	useEffect(() => {
		if (comments) store.set(comments)
	}, [store, comments])
	return store
}

/**
 * A reactive list of all comments on the open document, or an empty array when comments are not
 * enabled. Useful for app-level UI such as a comments sidebar.
 *
 * @public
 */
export function useComments(): TLComment[] {
	const store = useCommentStoreContext()
	return useValue('comments', () => store?.get() ?? [], [store])
}
