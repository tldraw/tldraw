import { createCommentAuthorizers } from '@tldraw/sync-collaboration'
import { recordAuthorizers, type TLSyncActor, type TLSyncForwardDiff } from '@tldraw/sync-core'
import {
	allow,
	atomic,
	denyAll,
	forType,
	isEqual,
	PermissionChain,
	PermissionMiddleware,
	RecordAccess,
	rewrite,
} from 'tldraw'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLDOCUMENT_ID,
	TLPage,
	TLRecord,
	TLShape,
	TLShapeId,
} from 'tldraw'

// Comment records are opt-in. Adding them to `TLRecord` lets one chain type cover them.
declare module 'tldraw' {
	interface TLGlobalRecordPropsMap {
		comment: TLComment
		'comment-thread': TLCommentThread
		'comment-reaction': TLCommentReaction
	}
}

// A copy of packages/sync-core/src/test/classroomPermissions.ts, which the use case tests run
// against a real room. The same chain runs in the in-page room and in each editor below.

export interface ClassroomMeta {
	userId: string
	role: 'teacher' | 'student' | 'viewer' | 'agent'
	/** For an agent: the frame it may work in. */
	frameId?: TLShapeId
	/**
	 * A guest who came in through a share link. The link's role can change while the guest is
	 * connected (`updateSessionMeta`), so the room lane stays open and the chain enforces the role.
	 */
	viaLink?: boolean
}
export type ClassroomActor = TLSyncActor<ClassroomMeta>
type Layer = PermissionMiddleware<TLRecord, ClassroomActor>
type Get = (id: string) => TLRecord | undefined

export const MAX_AGENT_WRITES_PER_BATCH = 50

/**
 * The document record types that the layers below have rules for. `user` records are open: each
 * editor writes its own user's profile (name and color).
 */
const RULED_TYPES = new Set([
	'document',
	'page',
	'shape',
	'binding',
	'asset',
	'user',
	'comment',
	'comment-thread',
	'comment-reaction',
])

/**
 * The page that a record is on: the page itself, the page above a shape, the page of a binding's
 * `from` shape, the page a user's presence is on, or the page of a record with a `pageId`
 * (comments and their threads).
 */
export function pageOf(record: TLRecord | undefined, get: Get): TLPage | undefined {
	for (let i = 0; record && i < 100; i++) {
		if (record.typeName === 'page') return record
		if (record.typeName === 'shape') {
			record = get(record.parentId)
			continue
		}
		if (record.typeName === 'binding') {
			record = get(record.fromId)
			continue
		}
		// a user's presence is on the page they look at: their cursor and selection are there
		if (record.typeName === 'instance_presence') {
			record = get(record.currentPageId)
			continue
		}
		const pageId = (record as { pageId?: unknown }).pageId
		return typeof pageId === 'string' ? pageOf(get(pageId), get) : undefined
	}
	return undefined
}

function ancestors(shape: TLShape, get: Get): TLShapeId[] {
	const ids: TLShapeId[] = []
	let parent = get(shape.parentId)
	while (parent && parent.typeName === 'shape' && ids.length < 100) {
		ids.push(parent.id)
		parent = get(parent.parentId)
	}
	return ids
}

/**
 * The records a read of `record` shows: a binding also shows the ids of both its shapes, so it is
 * readable only where both shapes are.
 */
function shownBy(record: TLRecord, get: Get): (TLRecord | undefined)[] {
	return record.typeName === 'binding' ? [get(record.fromId), get(record.toId)] : [record]
}

/**
 * Whether the actor owns a shape. A shape that this batch creates is the actor's, because
 * `stampOwner` sets its owner, so a new frame and its children can arrive in one batch.
 */
function ownsShape(id: string, batch: Parameters<Layer>[0]) {
	const before = batch.get(id)
	if (!before) return batch.getAfter(id)?.typeName === 'shape'
	return before.typeName === 'shape' && before.meta.ownerId === batch.actor.meta.userId
}

const isTeacher = (actor: ClassroomActor) => actor.meta.role === 'teacher'
const isHiddenPage = (page: TLPage | undefined, actor: ClassroomActor) =>
	!!page?.meta.private && !isTeacher(actor)

/** File write control: a viewer writes nothing. The room's `isReadonly` lane says the same. */
export function viewersReadOnly(...[batch, next]: Parameters<Layer>): ReturnType<Layer> {
	return batch.kind === 'write' && batch.actor.meta.role === 'viewer'
		? denyAll(batch, 'read only')
		: next()
}

/** A write's records before and after, or undefined for a read or an action. */
function writeOf(access: RecordAccess<TLRecord>) {
	if (access.type === 'read' || access.type === 'action') return undefined
	return { type: access.type, prev: access.prev, next: access.next }
}

/**
 * File read control: when a teacher closes the class, only teachers may open the file. The room
 * asks this at connect (action `room.open`) and again on `refreshReads`.
 */
export const closedClass: Layer = allow((access, batch) => {
	if (access.type !== 'action' || access.name !== 'room.open' || isTeacher(batch.actor)) {
		return undefined
	}
	const doc = batch.get(TLDOCUMENT_ID)
	return doc?.typeName === 'document' && doc.meta.closed ? 'class is closed' : undefined
})

/** Page read control: a private page, and all that is on it, is for teachers only. */
export const privatePages: Layer = allow((access, batch) => {
	if (access.type === 'read') {
		return shownBy(access.record, batch.get).some((record) =>
			isHiddenPage(pageOf(record, batch.get), batch.actor)
		)
			? 'private page'
			: undefined
	}
	const write = writeOf(access)
	if (!write) return undefined
	// A write may not touch a hidden page, before or after: no moves into or out of one.
	const before = write.prev ? pageOf(write.prev, batch.get) : undefined
	const after = write.next ? pageOf(write.next, batch.getAfter) : undefined
	if (isHiddenPage(before, batch.actor) || isHiddenPage(after, batch.actor)) return 'private page'
	return undefined
})

/** Page write control: only a teacher changes the file, pages, and a locked page's shapes. */
export const lockedPages: Layer = allow((access, batch) => {
	const write = writeOf(access)
	if (!write || isTeacher(batch.actor)) return undefined
	const typeName = (write.prev ?? write.next)!.typeName
	if (typeName === 'document') return 'only teachers change the file'
	if (typeName === 'page') return 'only teachers change pages'
	if (typeName !== 'shape' && typeName !== 'binding') return undefined
	const before = write.prev ? pageOf(write.prev, batch.get) : undefined
	const after = write.next ? pageOf(write.next, batch.getAfter) : undefined
	return before?.meta.locked || after?.meta.locked ? 'page is locked' : undefined
})

/** Shape write control, part 1: the server sets the owner of a new shape or asset. */
export const stampOwner: Layer = rewrite((access, { actor }) => {
	if (access.type !== 'create') return undefined
	const record = access.next
	if (record.typeName !== 'shape' && record.typeName !== 'asset') return undefined
	const meta = { ...record.meta, ownerId: actor.meta.userId }
	return { ...access, next: { ...record, meta } }
})

/**
 * Shape write control, part 2: a student or agent changes only their own shapes, and cannot put a
 * shape into someone else's frame. The owner never changes.
 */
export const ownShapes: Layer = allow((access, batch) => {
	if (access.type === 'read' || access.type === 'action' || isTeacher(batch.actor)) return undefined
	if ((access.prev ?? access.next).typeName !== 'shape') return undefined
	const prev = access.prev as TLShape | null
	const next = access.next as TLShape | null
	const me = batch.actor.meta.userId
	if (prev && prev.meta.ownerId !== me && !(next && arrowLetsGo(prev, next, batch))) {
		return 'not your shape'
	}
	if (prev && next && next.meta.ownerId !== prev.meta.ownerId) return 'owner is fixed'
	if (next) {
		const parentId = next.parentId
		if (
			batch.getAfter(parentId)?.typeName === 'shape' &&
			!ownsShape(parentId, batch) &&
			parentId !== batch.actor.meta.frameId
		) {
			return 'not your frame'
		}
	}
	return undefined
})

/** A binding that the batch removes because it deletes the actor's own shape at the `to` end. */
function unbindsFromOwnDeletedShape(access: RecordAccess<TLRecord>, batch: Parameters<Layer>[0]) {
	if (access.type !== 'delete' || access.prev.typeName !== 'binding') return false
	const { toId } = access.prev
	return batch.getAfter(toId) === undefined && ownsShape(toId, batch)
}

/**
 * When the actor deletes their own shape, someone else's arrow that points at it lets go: its
 * binding is deleted and its end becomes a point. Only the arrow's `start` and `end` change.
 */
function arrowLetsGo(prev: TLShape, next: TLShape, batch: Parameters<Layer>[0]) {
	if (prev.type !== 'arrow') return false
	const props = next.props as { start?: unknown; end?: unknown }
	const onlyEnds = isEqual(
		{ ...prev, props: { ...prev.props, start: props.start, end: props.end } },
		next
	)
	return (
		onlyEnds &&
		batch.items.some(
			(access) =>
				unbindsFromOwnDeletedShape(access, batch) &&
				access.type === 'delete' &&
				access.prev.typeName === 'binding' &&
				access.prev.fromId === prev.id
		)
	)
}

/**
 * Shape write control, part 3: a binding belongs to its `from` shape (an arrow). A student or
 * agent binds, moves and unbinds only their own arrows, and the arrows of others let go of a shape
 * that its owner deletes.
 */
export const ownBindings: Layer = forType(
	'binding',
	allow((access, batch) => {
		if (access.type === 'read' || access.type === 'action' || isTeacher(batch.actor))
			return undefined
		if (unbindsFromOwnDeletedShape(access, batch)) return undefined
		for (const binding of [access.prev, access.next]) {
			if (binding && !ownsShape(binding.fromId, batch)) return 'not your shape'
		}
		return undefined
	})
)

/** Asset write control: a student or agent changes only their own assets (an image's `src`). */
export const ownAssets: Layer = forType(
	'asset',
	allow((access, batch) => {
		if (access.type === 'read' || access.type === 'action' || isTeacher(batch.actor))
			return undefined
		if (access.prev && access.prev.meta.ownerId !== batch.actor.meta.userId) return 'not your asset'
		if (access.type === 'update' && access.next.meta.ownerId !== access.prev.meta.ownerId) {
			return 'owner is fixed'
		}
		return undefined
	})
)

/**
 * Agents: work only inside their frame (shapes, and the bindings of their arrows there), and at
 * most a fixed number of writes per batch. A limit per batch needs the whole batch, which a
 * per-record hook does not see. Agents read what a student reads.
 */
export function agentScope(...[batch, next]: Parameters<Layer>): ReturnType<Layer> {
	if (batch.kind !== 'write' || batch.actor.meta.role !== 'agent') return next()
	if (batch.items.length > MAX_AGENT_WRITES_PER_BATCH) return denyAll(batch, 'too many writes')
	const frameId = batch.actor.meta.frameId
	const inFrame = (shape: TLShape, get: Get) => !!frameId && ancestors(shape, get).includes(frameId)
	return allow<TLRecord, ClassroomActor>((access) => {
		const write = writeOf(access)
		if (!write) return undefined
		for (const [record, get] of [
			[write.prev, batch.get],
			[write.next, batch.getAfter],
		] as const) {
			if (!record) continue
			const shape = record.typeName === 'binding' ? get(record.fromId) : record
			if (shape?.typeName !== 'shape') return 'agents write shapes only'
			if (!inFrame(shape, get)) return 'outside your frame'
		}
		return undefined
	})(batch, next)
}

const commentRules: Layer = recordAuthorizers<TLRecord, ClassroomMeta>(
	createCommentAuthorizers<ClassroomMeta>({
		getUserId: (session) => session.meta.userId,
		canComment: (session) => session.meta.role !== 'viewer',
		canModifyComment: (ctx) =>
			ctx.userId === ctx.ownerId ||
			(ctx.action !== 'edit-comment' && ctx.session.meta.role === 'teacher'),
	})
)

/** A thread anchored to a shape, on the page where that shape is after the batch. */
function followsShape(thread: TLRecord | undefined, batch: Parameters<Layer>[0]) {
	if (thread?.typeName !== 'comment-thread' || thread.anchor.type !== 'shape') return false
	return pageOf(batch.getAfter(thread.anchor.shapeId), batch.getAfter)?.id === thread.pageId
}

/**
 * A comment that follows its thread, and the thread its shape, to another page. When a shape moves
 * to another page, the editor changes the `pageId` of its threads and their comments in the same
 * operation. That is not an edit by the person who moved the shape, so the author check does not
 * apply to it. The page rules still do.
 */
function followsThread(access: RecordAccess<TLRecord>, batch: Parameters<Layer>[0]) {
	if (access.type !== 'update') return false
	const { prev, next } = access
	if (prev.typeName !== 'comment' || next.typeName !== 'comment') return false
	if (prev.pageId === next.pageId || !isEqual({ ...prev, pageId: next.pageId }, next)) return false
	const thread = batch.getAfter(next.threadId)
	return (
		thread?.typeName === 'comment-thread' &&
		thread.pageId === next.pageId &&
		followsShape(thread, batch)
	)
}

/**
 * `createCommentAuthorizers` lets anyone with access move a thread. Here only its author or a
 * teacher moves or re-anchors a thread; anyone else's change to its page follows its shape.
 */
export const threadPlaces: Layer = forType(
	'comment-thread',
	allow((access, batch) => {
		if (access.type !== 'update' || isTeacher(batch.actor)) return undefined
		const { prev, next } = access
		if (prev.createdBy === batch.actor.meta.userId) return undefined
		if (!isEqual(prev.anchor, next.anchor)) return 'not your thread'
		if (prev.pageId !== next.pageId && !followsShape(next, batch)) return 'not your thread'
		return undefined
	})
)

/**
 * Comments: anyone but a viewer posts, always as themselves. Authors edit and delete their own
 * comments, and a teacher may delete any. The rules are `createCommentAuthorizers` from
 * `@tldraw/sync-collaboration`, which dotcom uses too, run as one layer. A comment that only
 * follows its thread skips them, and the later layers (page rules) still check it.
 */
export function comments(...[batch, next]: Parameters<Layer>): ReturnType<Layer> {
	const following = batch.kind === 'write' ? batch.items.filter((a) => followsThread(a, batch)) : []
	if (following.length === 0) return commentRules(batch, next)
	const own = batch.items.filter((access) => !following.includes(access))
	let rest: ReturnType<Layer> | null = null
	const result = commentRules({ ...batch, items: own }, (items = own) => {
		rest = next([...items, ...following])
		return rest
	})
	if (rest) return result
	// the comment rules denied all of their part without calling next
	const followed = next(following)
	return {
		allowed: [...result.allowed, ...followed.allowed],
		denied: [...result.denied, ...followed.denied],
	}
}

/** A plugin shape type: a teacher's grade for one student. */
export const GRADE_TYPE = 'grade'
const gradeFor = (shape: TLShape) => (shape.props as { studentId?: string }).studentId

/**
 * A plugin type with its own rules. Shape read control: a student reads only their own grade.
 * Shape write control: only a teacher writes grades.
 */
export const grades: Layer = allow((access, batch) => {
	if (access.type === 'action' || isTeacher(batch.actor)) return undefined
	const isGrade = (record: TLRecord | undefined): record is TLShape =>
		record?.typeName === 'shape' && record.type === GRADE_TYPE
	if (access.type === 'read') {
		// a binding to someone else's grade would show that grade's id
		return shownBy(access.record, batch.get).some(
			(record) => isGrade(record) && gradeFor(record) !== batch.actor.meta.userId
		)
			? 'not your grade'
			: undefined
	}
	return isGrade(access.prev ?? access.next) ? 'only teachers grade' : undefined
})

/** Actions that are not record writes: the client hides the UI, a server endpoint asks too. */
export const teacherActions: Layer = allow((access, { actor }) => {
	if (access.type !== 'action') return undefined
	const { name } = access
	if (name.startsWith('page.') || name.startsWith('grade.') || name === 'file.share') {
		return isTeacher(actor)
	}
	return undefined
})

/**
 * Closed by default: a write to a document record type that no layer above has rules for is
 * denied. A plugin that adds a record type adds its layer, and the type opens with it.
 */
export const closedByDefault: Layer = allow((access) => {
	const write = writeOf(access)
	if (!write) return undefined
	return RULED_TYPES.has((write.prev ?? write.next)!.typeName)
		? undefined
		: 'no rules for this type'
})

/**
 * Whether a committed change can change what sessions may read beyond the records it changes. A
 * shape's read rules read its page and its parents, and `room.open` reads the document, so the
 * host calls `refreshReads()` after such a change.
 */
export function changesReadRules(diff: TLSyncForwardDiff<TLRecord>) {
	return Object.values(diff.puts).some((put) => {
		if (!Array.isArray(put)) return put.typeName === 'page' || put.typeName === 'document'
		const [before, after] = put
		if (after.typeName === 'page' || after.typeName === 'document') return true
		return (
			before.typeName === 'shape' &&
			after.typeName === 'shape' &&
			before.parentId !== after.parentId
		)
	})
}

export function classroomPermissions({ atomicPushes = true } = {}) {
	return new PermissionChain<TLRecord, ClassroomActor>(
		...(atomicPushes ? [atomic<TLRecord, ClassroomActor>()] : []),
		viewersReadOnly,
		closedClass,
		threadPlaces,
		comments,
		privatePages,
		lockedPages,
		// before the per-shape rules: the limit counts the batch as the client sent it
		agentScope,
		grades,
		stampOwner,
		ownShapes,
		ownBindings,
		ownAssets,
		teacherActions,
		closedByDefault
	)
}

export function classroomActor(meta: ClassroomMeta, sessionId = meta.userId): ClassroomActor {
	return {
		sessionId,
		isReadonly: meta.role === 'viewer',
		objectAccess: meta.role === 'viewer' ? 'read' : 'write',
		meta,
	}
}
