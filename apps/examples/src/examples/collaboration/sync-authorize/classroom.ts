import { createCommentAuthorize } from '@tldraw/sync-collaboration'
import {
	Authorize,
	AuthorizeContext,
	AuthorizeGet,
	AuthorizeResult,
	TLPageId,
	TLRecord,
	TLShape,
	TLShapeId,
	combineAuthorize,
	createShapeId,
	isShapeId,
	toRichText,
} from 'tldraw'

export interface Actor {
	userId: string
	name: string
	role: 'teacher' | 'student' | 'viewer' | 'agent'
	/** Teams whose pages the actor can see. */
	teams?: string[]
	/** For an agent: the only frame that it may write inside. */
	frameId?: TLShapeId
}

export const AGENT_FRAME_ID = createShapeId('agent-frame')

export const ACTORS: Record<string, Actor> = {
	teacher: { userId: 'teacher', name: 'Ms. Rivera (teacher)', role: 'teacher' },
	ana: { userId: 'ana', name: 'Ana (red team)', role: 'student', teams: ['red'] },
	ben: { userId: 'ben', name: 'Ben (blue team)', role: 'student', teams: ['blue'] },
	guest: { userId: 'guest', name: 'Guest (view-only link)', role: 'viewer' },
	bot: { userId: 'bot', name: 'Helper bot (agent)', role: 'agent', frameId: AGENT_FRAME_ID },
}

const STUDENT_TOOLS = [
	'select',
	'hand',
	'draw',
	'geo',
	'arrow',
	'note',
	'eraser',
	'text',
	'comment',
]

function pageIdOf(record: TLRecord | undefined, get: AuthorizeGet): TLPageId | null {
	if (!record) return null
	if (record.typeName === 'page') return record.id
	if (record.typeName === 'shape') {
		let parentId = record.parentId
		for (let i = 0; i < 100 && isShapeId(parentId); i++) {
			const parent = get(parentId)
			if (!parent) return null
			parentId = parent.parentId
		}
		return parentId as TLPageId
	}
	if (record.typeName === 'binding') return pageIdOf(get(record.fromId), get)
	// Comment threads, comments, and reactions all carry their page.
	if ('pageId' in record) return record.pageId as TLPageId
	return null
}

function isInside(shape: TLShape, frameId: TLShapeId, get: AuthorizeGet) {
	let parentId = shape.parentId
	for (let i = 0; i < 100 && isShapeId(parentId); i++) {
		if (parentId === frameId) return true
		parentId = get(parentId)?.parentId ?? (null as any)
	}
	return false
}

/**
 * The classroom rules. The sync room runs this function for every read and write, and each
 * editor runs it for its UI and to stop local writes early.
 */
export function classroom(ctx: AuthorizeContext<TLRecord, Actor>): AuthorizeResult<TLRecord> {
	const { actor } = ctx
	const isTeacher = actor.role === 'teacher'

	// [1]
	if (ctx.action === 'cards:reveal') return isTeacher
	if (ctx.action === 'bot:run') return actor.role === 'agent'
	if (ctx.action === 'comments:write') return actor.role === 'agent' ? false : undefined
	if (ctx.action === 'comments:delete') return isTeacher || undefined
	if (ctx.action.startsWith('tool:')) {
		if (isTeacher) return true
		if (actor.role === 'viewer') return ctx.action === 'tool:select' || ctx.action === 'tool:hand'
		return STUDENT_TOOLS.includes(ctx.action.slice('tool:'.length))
	}

	const record = ctx.record
	if (!record) return undefined

	// [2]
	const pageIds = new Set([pageIdOf(record, ctx.get)])
	if (ctx.action === 'update' && ctx.next) pageIds.add(pageIdOf(ctx.next, ctx.get))
	for (const pageId of pageIds) {
		const page = pageId ? ctx.get(pageId) : undefined
		const team = page?.meta.team as string | undefined
		if (team && !isTeacher && !actor.teams?.includes(team)) {
			return { deny: 'This page is for another team' }
		}
	}

	// [3]
	if (ctx.action === 'read') {
		if (
			record.typeName === 'shape' &&
			record.meta.card &&
			!record.meta.revealed &&
			record.meta.holder !== actor.userId &&
			!isTeacher
		) {
			return {
				record: { ...record, props: { ...(record.props as any), richText: toRichText('?') } },
			}
		}
		return undefined
	}

	// [4]
	if (record.typeName === 'user') return undefined

	// [5]
	if (actor.role === 'viewer') return { deny: 'You can only view this file' }
	if (isTeacher) return undefined

	// [6]
	for (const pageId of pageIds) {
		if (pageId && ctx.get(pageId)?.meta.locked) return { deny: 'This page is locked' }
	}
	if (record.typeName === 'page' || record.typeName === 'document') {
		return { deny: 'Only the teacher can change pages' }
	}

	// [7]
	if (record.typeName === 'shape') {
		if (ctx.action === 'create') {
			if (actor.frameId && !isInside(record, actor.frameId, ctx.get)) {
				return { deny: 'The bot writes only inside its frame' }
			}
			return { record: { ...record, meta: { ...record.meta, ownerId: actor.userId } } }
		}
		if (record.meta.ownerId !== actor.userId) return { deny: 'This is not your shape' }
		if (ctx.action === 'update' && ctx.next) {
			const next = ctx.next as TLShape
			if (next.meta.ownerId !== record.meta.ownerId) return { deny: 'The owner cannot change' }
			if (next.meta.revealed !== record.meta.revealed) {
				return ctx.can('cards:reveal', record) || { deny: 'Only the teacher reveals cards' }
			}
			if (actor.frameId && !isInside(next, actor.frameId, ctx.get)) {
				return { deny: 'The bot writes only inside its frame' }
			}
		}
		return undefined
	}

	// [8]
	if (record.typeName === 'binding' && ctx.action === 'create') {
		const to = ctx.get(record.toId)
		if (to?.meta.ownerId !== actor.userId) return { deny: 'You can only connect your own shapes' }
	}
	return undefined
}

/**
 * The rules that the room and the editors run: the classroom rules, and the shared comment rules.
 * The comment rules stamp authorship and let authors edit and delete their own comments. The
 * classroom rules widen `comments:delete` to the teacher, and deny `comments:write` to the bot.
 */
export const authorize: Authorize<TLRecord, Actor> = combineAuthorize(
	classroom,
	// [9]
	createCommentAuthorize<TLRecord, Actor>({
		getUserId: (actor) => (actor.role === 'viewer' ? null : actor.userId),
	})
)

/*
[1]
Custom actions are questions with no record. The toolbar asks `tool:<id>`, the reveal button
asks `cards:reveal`, and the bot's button asks `bot:run`. A custom action that no rule allows is denied. The comment UI asks
`comments:write`, `comments:edit`, and `comments:delete`: the comment rules allow them for the
author, and these lines widen delete to the teacher (a moderator) and stop the bot from commenting.

[2]
Page read control. A team page and everything on it is hidden from everyone outside the team. A
move checks the page before and after, so a shape cannot be moved onto a hidden page.

[3]
A read can return a changed copy. Here a card's face is hidden from everyone but its holder until
the teacher reveals it. The sync room sends the copy, so the text never reaches other clients.

[4]
The editor writes the current user's own `user` record when it loads. If the rules denied it, the
room would roll it back, and the editor would write it again, without end.

[5]
File write control. A view-only link writes nothing else.

[6]
Page write control. A locked page is the teacher's, and only the teacher changes pages.

[7]
Shape write control. A new shape is stamped with its owner, and only the owner may change it. A
shape with no owner (the teacher's) is nobody's to change. The editor applies the stamp too, so a
new shape is yours at once. The bot may only write inside its frame.

[8]
An arrow may only connect your own shapes. The arrow and its bindings are one operation, so the
editor reverts the arrow too.

[9]
`getUserId` gives the identity that comments are stamped with. A view-only link has none, so it
cannot comment.
*/
