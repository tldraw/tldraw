import { useValue } from '@tldraw/editor'
import { ReactNode, createContext, useContext } from 'react'
import { TLComment, TLCommentStore } from './TLCommentStore'

const CommentStoreContext = createContext<TLCommentStore | null>(null)

/**
 * Provides a {@link TLCommentStore} to the comment UI. `<Tldraw comments={...} />` sets this up for
 * you; use it directly only if you are wiring the comment components by hand.
 *
 * @public
 * @react
 */
export function CommentStoreProvider({
	store,
	children,
}: {
	store: TLCommentStore | null
	children: ReactNode
}) {
	return <CommentStoreContext.Provider value={store}>{children}</CommentStoreContext.Provider>
}

/**
 * Get the {@link TLCommentStore} provided to `<Tldraw comments={...} />`, or `null` when comments
 * are not enabled.
 *
 * @public
 */
export function useCommentStore(): TLCommentStore | null {
	return useContext(CommentStoreContext)
}

/**
 * A reactive list of all comments on the open document, or an empty array when comments are not
 * enabled.
 *
 * @public
 */
export function useComments(): TLComment[] {
	const store = useCommentStore()
	return useValue('comments', () => store?.getCommentsForDocument().get() ?? [], [store])
}
