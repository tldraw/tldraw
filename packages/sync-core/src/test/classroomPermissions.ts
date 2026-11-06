import {
	allow,
	atomic,
	denyAll,
	forType,
	PermissionChain,
	PermissionMiddleware,
	RecordAccess,
	rewrite,
} from '@tldraw/store'
import { TLDOCUMENT_ID, TLPage, TLPageId, TLRecord, TLShape, TLShapeId } from '@tldraw/tlschema'
import { TLSyncActor } from '../lib/permissions'

// The use cases of the permissions research, written as one chain. The same chain runs in the
// room and in the client store (see permissionUseCases.test.ts), and the examples app has a copy
// for its demos.

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
 * The page that a record is on: the page itself, the page above a shape, the page a user's
 * presence is on, or the page of a record with a `pageId` (comments and their threads).
 */
export function pageOf(record: TLRecord | undefined, get: Get): TLPage | undefined {
	for (let i = 0; record && i < 100; i++) {
		if (record.typeName === 'page') return record
		if (record.typeName === 'shape') {
			record = get(record.parentId)
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
	if (typeName !== 'shape') return undefined
	const before = write.prev ? pageOf(write.prev, batch.get) : undefined
	const after = write.next ? pageOf(write.next, batch.getAfter) : undefined
	return before?.meta.locked || after?.meta.locked ? 'page is locked' : undefined
})

/** Shape write control, part 1: the server sets the owner of a new shape. */
export const stampOwner: Layer = forType(
	'shape',
	rewrite((access, { actor }) => {
		if (access.type !== 'create') return undefined
		const next = { ...access.next, meta: { ...access.next.meta, ownerId: actor.meta.userId } }
		return { ...access, next }
	})
)

/**
 * Shape write control, part 2: a student or agent changes only their own shapes, and cannot put a
 * shape into someone else's frame. The owner never changes.
 */
export const ownShapes: Layer = forType(
	'shape',
	allow((access, batch) => {
		if (access.type === 'read' || access.type === 'action' || isTeacher(batch.actor))
			return undefined
		const me = batch.actor.meta.userId
		if (access.prev && access.prev.meta.ownerId !== me) return 'not your shape'
		if (access.type === 'update' && access.next.meta.ownerId !== access.prev.meta.ownerId) {
			return 'owner is fixed'
		}
		if (access.next) {
			const parent = batch.getAfter(access.next.parentId)
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
)

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
		const write = writeOf(access)
		if (!write) return undefined
		for (const [record, get] of [
			[write.prev, batch.get],
			[write.next, batch.getAfter],
		] as const) {
			if (!record) continue
			if (record.typeName !== 'shape') return 'agents write shapes only'
			if (!inFrame(record, get)) return 'outside your frame'
		}
		return undefined
	})(batch, next)
}

/** A plugin shape type: a teacher's grade for one student. */
export const GRADE_TYPE = 'grade'
const gradeFor = (shape: TLShape) => (shape.props as { studentId?: string }).studentId

/**
 * A plugin type with its own rules. Shape read control: a student reads only their own grade.
 * Shape write control: only a teacher writes grades.
 */
export const grades: Layer = forType(
	'shape',
	allow((access, batch) => {
		if (access.type === 'action' || isTeacher(batch.actor)) return undefined
		if (access.type === 'read') {
			if (access.record.type !== GRADE_TYPE) return undefined
			return gradeFor(access.record) === batch.actor.meta.userId ? undefined : 'not your grade'
		}
		return (access.prev ?? access.next).type === GRADE_TYPE ? 'only teachers grade' : undefined
	})
)

/** Actions that are not record writes: the client hides the UI, a server endpoint asks too. */
export const teacherActions: Layer = allow((access, { actor }) => {
	if (access.type !== 'action') return undefined
	const { name } = access
	if (name.startsWith('page.') || name.startsWith('grade.') || name === 'file.share') {
		return isTeacher(actor)
	}
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
		grades,
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

export type { TLPageId }
