import { CommentAuthor } from '@tldraw/commenting'
import { createContext } from 'react'

/**
 * The author resolver, from `CommentsOnCanvas`. Component slots get only the records (a pin gets its
 * thread and comments), and React context crosses the portals pins and threads render in.
 */
export const ResolveCommentAuthorContext = createContext<(id: string) => CommentAuthor | undefined>(
	() => undefined
)
