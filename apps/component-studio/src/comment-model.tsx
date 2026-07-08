import { CommentCardProps, CommentText } from '@tldraw/commenting'
import { createComment, createCommentThread, TLComment, TLCommentThread } from '@tldraw/comments'
import { createShapeId, TLPageId, TLRichText, toRichText } from 'tldraw'

// The studio builds real @tldraw/tlschema records (TLComment / TLCommentThread) and maps
// them onto the presentational commenting components through an adapter — the same boundary
// the real editor will use. Rich-text bodies are authored here as markdown text.

interface User {
	id: string
	name: string
}

const USERS: Record<string, User> = {
	ada: { id: 'ada', name: 'Ada Lovelace' },
	me: { id: 'me', name: 'You' },
}

function resolveUser(id: string): User {
	return USERS[id] ?? { id, name: id }
}

/** Flatten a rich-text body to its source string. `toRichText` puts each line in its own
 *  paragraph, so joining paragraph text with newlines recovers the original (markdown). */
function richTextToString(rich: TLRichText): string {
	const doc = rich as { content?: Array<{ content?: Array<{ text?: string }> }> }
	return (doc.content ?? [])
		.map((paragraph) => (paragraph.content ?? []).map((node) => node.text ?? '').join(''))
		.join('\n')
}

/** Adapt a TLComment record to CommentCard props — the "components consume the model" boundary. */
export function commentToCardProps(comment: TLComment): CommentCardProps {
	return {
		author: resolveUser(comment.authorId).name,
		body: <CommentText text={richTextToString(comment.body)} />,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === 'me',
		edited: comment.editedAt !== null,
	}
}

/** A thread's resolver as a display name, or undefined if unresolved. */
export function resolvedByName(thread: TLCommentThread): string | undefined {
	return thread.resolved ? resolveUser(thread.resolved.by).name : undefined
}

const NOW = Date.now()
const HOUR = 3_600_000
const PAGE_ID = 'page:studio' as TLPageId

/** A sample thread, anchored to a shape. */
export const sampleThread: TLCommentThread = createCommentThread({
	pageId: PAGE_ID,
	anchor: { type: 'shape', shapeId: createShapeId('box') },
	createdBy: 'ada',
	now: NOW - 2 * HOUR,
})

/** Sample thread messages as real TLComment records — markdown bodies, one edited. */
export const sampleComments: TLComment[] = [
	createComment({
		threadId: sampleThread.id,
		pageId: PAGE_ID,
		authorId: 'ada',
		body: toRichText('Should this button be **primary**? See [the spec](https://tldraw.dev).'),
		now: NOW - 2 * HOUR,
	}),
	{
		...createComment({
			threadId: sampleThread.id,
			pageId: PAGE_ID,
			authorId: 'me',
			body: toRichText('Good call — updating it now:\n\n- swap the `variant` prop\n- ship it'),
			now: NOW - HOUR,
		}),
		editedAt: NOW - 30 * 60_000,
	},
]
