import { CommentCardProps } from './sketchbooks/comments/comment-card'

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

/** A comment thread: owns the anchor and the resolution state. */
export interface CommentThread {
	id: string
	anchor: TLCommentAnchor
	createdBy: string
	createdAt: number
	resolvedAt: number | null
	resolvedBy: string | null
}

/** A single comment message within a thread. */
export interface Comment {
	id: string
	threadId: string
	authorId: string
	createdAt: number
	editedAt: number | null
	body: string
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
	}
}

const NOW = Date.now()
const HOUR = 3_600_000

/** Sample thread messages, as model records. */
export const sampleComments: Comment[] = [
	{
		id: 'c1',
		threadId: 't1',
		authorId: 'ada',
		createdAt: NOW - 2 * HOUR,
		editedAt: null,
		body: 'Should this button be primary?',
	},
	{
		id: 'c2',
		threadId: 't1',
		authorId: 'me',
		createdAt: NOW - HOUR,
		editedAt: null,
		body: 'Good call — updating it now.',
	},
]
