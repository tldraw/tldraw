import type { TLSyncActor } from '@tldraw/sync-core'
import {
	allow,
	atomic,
	denyAll,
	PermissionChain,
	PermissionMiddleware,
	RecordAccess,
	rewrite,
} from 'tldraw'
import { TLDOCUMENT_ID, TLPage, TLRecord, TLShape, TLShapeId } from 'tldraw'

// A copy of packages/sync-core/src/test/classroomPermissions.ts, which the use case tests run
// against a real room. The same chain runs in the in-page room and in each editor below.

export interface ClassroomMeta {
	userId: string
	role: 'teacher' | 'student' | 'viewer' | 'agent'
	/** For an agent: the frame it may work in. */
	frameId?: TLShapeId
}
export type ClassroomActor = TLSyncActor<ClassroomMeta>
type Layer = PermissionMiddleware<TLRecord, ClassroomActor>
type Get = (id: string) => TLRecord | undefined

export const MAX_AGENT_WRITES_PER_BATCH = 50

/** The page that a record is on: the page itself, or the page above a shape. */
export function pageOf(record: TLRecord | undefined, get: Get): TLPage | undefined {
	for (let i = 0; record && i < 100; i++) {
		if (record.typeName === 'page') return record
		if (record.typeName !== 'shape') return undefined
		record = get(record.parentId)
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

/** A shape write's shapes before and after, or undefined for anything else. */
function shapeWriteOf(access: RecordAccess<TLRecord>) {
	const write = writeOf(access)
	if (!write || (write.prev ?? write.next)!.typeName !== 'shape') return undefined
	return write as { type: typeof write.type; prev: TLShape | null; next: TLShape | null }
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
		return isHiddenPage(pageOf(access.record, batch.get), batch.actor) ? 'private page' : undefined
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
	if (!shapeWriteOf(access)) return undefined
	const before = write.prev ? pageOf(write.prev, batch.get) : undefined
	const after = write.next ? pageOf(write.next, batch.getAfter) : undefined
	return before?.meta.locked || after?.meta.locked ? 'page is locked' : undefined
})

/** Shape write control, part 1: the server sets the owner of a new shape. */
export const stampOwner: Layer = rewrite((access, { actor }) => {
	if (access.type !== 'create' || access.next.typeName !== 'shape') return undefined
	const next = { ...access.next, meta: { ...access.next.meta, ownerId: actor.meta.userId } }
	return { ...access, next }
})

/**
 * Shape write control, part 2: a student or agent changes only their own shapes, and cannot put a
 * shape into someone else's frame. The owner never changes.
 */
export const ownShapes: Layer = allow((access, batch) => {
	const write = shapeWriteOf(access)
	if (!write || isTeacher(batch.actor)) return undefined
	const me = batch.actor.meta.userId
	if (write.prev && write.prev.meta.ownerId !== me) return 'not your shape'
	if (write.prev && write.next && write.next.meta.ownerId !== write.prev.meta.ownerId) {
		return 'owner is fixed'
	}
	if (write.next) {
		const parent = batch.getAfter(write.next.parentId)
		if (
			parent?.typeName === 'shape' &&
			parent.meta.ownerId !== me &&
			parent.id !== batch.actor.meta.frameId
		) {
			return 'not your frame'
		}
	}
	return undefined
})

/**
 * Agents: work only inside their frame, and at most a fixed number of writes per batch. A limit
 * per batch needs the whole batch, which a per-record hook does not see.
 */
export function agentScope(...[batch, next]: Parameters<Layer>): ReturnType<Layer> {
	if (batch.kind !== 'write' || batch.actor.meta.role !== 'agent') return next()
	if (batch.items.length > MAX_AGENT_WRITES_PER_BATCH) return denyAll(batch, 'too many writes')
	const frameId = batch.actor.meta.frameId
	const inFrame = (shape: TLShape, get: Get) => !!frameId && ancestors(shape, get).includes(frameId)
	return allow<TLRecord, ClassroomActor>((access) => {
		const write = shapeWriteOf(access)
		if (!write) return 'agents write shapes only'
		if (write.prev && !inFrame(write.prev, batch.get)) return 'outside your frame'
		if (write.next && !inFrame(write.next, batch.getAfter)) return 'outside your frame'
		return undefined
	})(batch, next)
}

/** Actions that are not record writes: the client hides the UI, a server endpoint asks too. */
export const teacherActions: Layer = allow((access, { actor }) => {
	if (access.type !== 'action') return undefined
	if (access.name.startsWith('page.') || access.name === 'file.share') return isTeacher(actor)
	return undefined
})

export function classroomPermissions({ atomicPushes = true } = {}) {
	return new PermissionChain<TLRecord, ClassroomActor>(
		...(atomicPushes ? [atomic<TLRecord, ClassroomActor>()] : []),
		viewersReadOnly,
		closedClass,
		privatePages,
		lockedPages,
		// before the per-shape rules: the limit counts the batch as the client sent it
		agentScope,
		stampOwner,
		ownShapes,
		teacherActions
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
