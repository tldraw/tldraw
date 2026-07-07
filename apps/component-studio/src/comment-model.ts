import { CommentCardProps } from '@tldraw/commenting'

// A local mirror of the tldraw commenting data model (PR #9471), so our UI components
// can be exercised against the real record shapes. Ids and rich text are simplified to
// strings here; swap these for the real @tldraw/tlschema types once the PR lands.

/** Where a comment thread is anchored on the canvas (a discriminated union). */
export type TLCommentAnchor =
	| { type: 'shape'; shapeId: string }
	| { type: 'point'; x: number; y: number }
	| { type: 'region'; x: number; y: number; w: number; h: number }
	| { type: 'page' }
	| { type: 'text-range'; shapeId: string; from: number; to: number }

/** A comment thread: owns the anchor and the resolution state. Mirrors commentThreadRecordConfig. */
export interface CommentThread {
	id: string
	typeName: 'comment-thread'
	/** The page the thread lives on. */
	pageId: string
	/** Where the thread is anchored on that page. */
	anchor: TLCommentAnchor
	createdBy: string
	createdAt: number
	/** Set together when resolved; both null when reopened. */
	resolvedAt: number | null
	resolvedBy: string | null
	meta: Record<string, unknown>
}

/** A single comment message within a thread. Mirrors commentRecordConfig. */
export interface Comment {
	id: string
	typeName: 'comment'
	threadId: string
	/** Denormalized from the thread so per-page queries don't need a join. */
	pageId: string
	authorId: string
	createdAt: number
	/** Null until the comment is first edited. */
	editedAt: number | null
	/** Rich text body — authored as markdown for now. */
	body: string
	meta: Record<string, unknown>
}

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

/** Adapt a model Comment to CommentCard props — the "components consume the model" boundary. */
export function commentToCardProps(comment: Comment): CommentCardProps {
	return {
		author: resolveUser(comment.authorId).name,
		body: comment.body,
		date: new Date(comment.createdAt).toISOString(),
		you: comment.authorId === 'me',
		edited: comment.editedAt !== null,
	}
}

/** Resolve a thread's resolver to a display name, or undefined if unresolved. */
export function resolvedByName(thread: CommentThread): string | undefined {
	return thread.resolvedBy ? resolveUser(thread.resolvedBy).name : undefined
}

const NOW = Date.now()
const HOUR = 3_600_000

/** A sample thread, anchored to a shape. */
export const sampleThread: CommentThread = {
	id: 't1',
	typeName: 'comment-thread',
	pageId: 'page:1',
	anchor: { type: 'shape', shapeId: 'shape:box' },
	createdBy: 'ada',
	createdAt: NOW - 2 * HOUR,
	resolvedAt: null,
	resolvedBy: null,
	meta: {},
}

/** Sample thread messages, as model records — with markdown bodies and an edit. */
export const sampleComments: Comment[] = [
	{
		id: 'c1',
		typeName: 'comment',
		threadId: 't1',
		pageId: 'page:1',
		authorId: 'ada',
		createdAt: NOW - 2 * HOUR,
		editedAt: null,
		body: 'Should this button be **primary**? See [the spec](https://tldraw.dev).',
		meta: {},
	},
	{
		id: 'c2',
		typeName: 'comment',
		threadId: 't1',
		pageId: 'page:1',
		authorId: 'me',
		createdAt: NOW - HOUR,
		editedAt: NOW - 30 * 60_000,
		body: 'Good call — updating it now:\n\n- swap the `variant` prop\n- ship it',
		meta: {},
	},
]
