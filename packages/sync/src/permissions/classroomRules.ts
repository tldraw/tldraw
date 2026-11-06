import { createCommentAuthorizers } from '@tldraw/sync-collaboration'
import { TLAuthorizerSession, TLRecordRules } from '@tldraw/sync-core'
import {
	BaseRecord,
	commentSchemaRecords,
	CustomRecordInfo,
	PageRecordType,
	RecordId,
	T,
	TLBinding,
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLInstancePresence,
	TLPage,
	TLPageId,
	TLParentId,
	TLRecord,
	TLShape,
	TLShapeId,
	UnknownRecord,
} from 'tldraw'

// The rules of one shared board, written once with the existing hook shapes. The server spreads
// them into `TLSocketRoom`; the client registers them on its store and derives locks from them.

/** `none` has no access to the file: the host refuses the connection. */
export type Role = 'teacher' | 'student' | 'commenter' | 'viewer' | 'agent' | 'none'

export interface ClassroomMeta {
	userId: string
	role: Role
	/** For agents: the frame that the agent may write in. */
	areaId?: TLShapeId
}

/** A plugin record type: the rules treat it like any built-in type, by its `typeName`. */
export interface TLGrade extends BaseRecord<'grade', RecordId<TLGrade>> {
	studentId: string
	score: string
}

export const gradeRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('grade'),
		studentId: T.string,
		score: T.string,
	}),
}

/** The custom record types of the board, for the schema on the server and on each client. */
export const classroomRecords = { ...commentSchemaRecords, grade: gradeRecord }

export type ClassroomRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction | TLGrade
type Session = TLAuthorizerSession<ClassroomMeta>
type Get = (id: string) => UnknownRecord | undefined

/** What the host gives a session at connect, for each role. Share links map to a role. `null`
 *  means the host refuses the connection. */
export function accessForRole(role: Role) {
	if (role === 'none') return null
	return {
		isReadonly: role === 'commenter' || role === 'viewer',
		objectAccess: role === 'viewer' ? ('read' as const) : ('write' as const),
	}
}

/** Shape types that students may create. Agents and teachers may create any type. */
export const STUDENT_SHAPE_TYPES = ['draw', 'geo', 'note', 'text', 'arrow', 'highlight']

/** Shape types that only the teacher may create, such as a plugin's `stamp` shape. */
export const TEACHER_SHAPE_TYPES = ['stamp']

export function getPageIdOfParent(parentId: TLParentId, get: Get): TLPageId | undefined {
	let id: string = parentId
	for (let i = 0; i < 100; i++) {
		if (PageRecordType.isId(id)) return id
		const parent = get(id) as TLShape | undefined
		if (!parent) return undefined
		id = parent.parentId
	}
	return undefined
}

function isInsideShape(parentId: TLParentId, ancestorId: TLShapeId, get: Get) {
	let id: string = parentId
	for (let i = 0; i < 100; i++) {
		if (id === ancestorId) return true
		const parent = get(id) as TLShape | undefined
		if (!parent) return false
		id = parent.parentId
	}
	return false
}

export function canReadPage(meta: ClassroomMeta, page: TLPage | undefined) {
	if (!page) return false
	return !page.meta.private || meta.role === 'teacher'
}

export function isPageReadonlyFor(meta: ClassroomMeta, page: TLPage | undefined) {
	return !!page?.meta.readonly && meta.role !== 'teacher'
}

function canReadOnPage(session: Session, pageId: TLPageId | undefined, get: Get) {
	return canReadPage(session.meta, get(pageId ?? '') as TLPage | undefined)
}

function canWriteShape(session: Session, shape: TLShape, get: Get) {
	const { meta } = session
	const page = get(getPageIdOfParent(shape.parentId, get) ?? '') as TLPage | undefined
	if (isPageReadonlyFor(meta, page)) return false
	if (meta.role === 'teacher') return true
	if (meta.role === 'agent') return !!meta.areaId && isInsideShape(shape.parentId, meta.areaId, get)
	return shape.meta.ownerId === meta.userId
}

/** A binding belongs to its shapes: it is as visible as the shape it starts from. */
function canReadBinding(session: Session, binding: TLBinding, get: Get) {
	const from = get(binding.fromId) as TLShape | undefined
	return !!from && canReadOnPage(session, getPageIdOfParent(from.parentId, get), get)
}

/** Whether a session may write a shape that exists, by id. */
function canWriteShapeId(session: Session, id: TLShapeId, get: Get) {
	const shape = get(id) as TLShape | undefined
	return !!shape && canWriteShape(session, shape, get)
}

export const classroomRules: TLRecordRules<ClassroomRecord, ClassroomMeta> = {
	authorizeRead: {
		page: ({ session, record }) => canReadPage(session.meta, record),
		shape: ({ session, record, get }) =>
			canReadOnPage(session, getPageIdOfParent(record.parentId, get), get),
		binding: ({ session, record, get }) => canReadBinding(session, record, get),
		instance_presence: ({ session, record, get }) =>
			canReadOnPage(session, (record as TLInstancePresence).currentPageId, get),
		'comment-thread': ({ session, record, get }) => canReadOnPage(session, record.pageId, get),
		comment: ({ session, record, get }) => canReadOnPage(session, record.pageId, get),
		'comment-reaction': ({ session, record, get }) => canReadOnPage(session, record.pageId, get),
		grade: ({ session, record }) =>
			session.meta.role === 'teacher' || record.studentId === session.meta.userId,
	},
	authorizeRecord: {
		...createCommentAuthorizers<ClassroomMeta>({
			getUserId: (session) => session.meta.userId,
			// commenters may comment on a read-only canvas; viewers are stopped by `objectAccess`
			canComment: (session) => session.meta.role !== 'viewer',
			// add own vs manage any: the teacher may take down any comment, but not edit it
			canModifyComment: (ctx) =>
				ctx.userId === ctx.ownerId ||
				(ctx.action !== 'edit-comment' && ctx.session.meta.role === 'teacher'),
		}),
		page: ({ session, next, prev }) => {
			if (session.meta.role !== 'teacher') return null
			// Every user needs a page they may read, or their editor has no page to show. The home
			// page keeps that true: it can't be deleted, made private, or stop being home.
			if (prev?.meta.home && (!next || next.meta.private || !next.meta.home)) return null
			return next ?? prev
		},
		document: ({ session, next, prev }) =>
			session.meta.role === 'teacher' ? (next ?? prev) : null,
		// anyone who may draw may add an image; only its owner or the teacher may change it
		asset: ({ session, type, prev, next }) => {
			const { meta } = session
			if (type === 'create') return { ...next, meta: { ...next.meta, ownerId: meta.userId } }
			if (meta.role !== 'teacher' && prev.meta.ownerId !== meta.userId) return null
			if (type === 'update' && next.meta.ownerId !== prev.meta.ownerId) return null
			return next ?? prev
		},
		grade: ({ session, next, prev }) => (session.meta.role === 'teacher' ? (next ?? prev) : null),
		// A binding changes how its `from` shape (an arrow) behaves, so it needs write access to
		// that shape. A delete also follows from deleting either end, so either end is enough.
		binding: ({ session, type, prev, next, get }) => {
			if (type === 'delete') {
				// an end that is already gone (deleted earlier in the same push) also allows it
				const free = (id: TLShapeId) => !get(id) || canWriteShapeId(session, id, get)
				return free(prev.fromId) || free(prev.toId) ? prev : null
			}
			if (prev && !canWriteShapeId(session, prev.fromId, get)) return null
			return canWriteShapeId(session, next.fromId, get) ? next : null
		},
		shape: ({ session, type, prev, next, get }) => {
			const { meta } = session
			if (type === 'create') {
				if (meta.role === 'student' && !STUDENT_SHAPE_TYPES.includes(next.type)) return null
				if (meta.role !== 'teacher' && TEACHER_SHAPE_TYPES.includes(next.type)) return null
				// the owner is stamped from the session, never trusted from the client
				const stamped = { ...next, meta: { ...next.meta, ownerId: meta.userId } }
				return canWriteShape(session, stamped, get) ? stamped : null
			}
			if (!canWriteShape(session, prev, get)) return null
			if (type === 'delete') return prev
			// a type is chosen at create, where the type limits apply
			if (next.type !== prev.type) return null
			if (next.meta.ownerId !== prev.meta.ownerId) return null
			// the lock action is the teacher's: the UI hides it, and this rule enforces it
			if (next.isLocked !== prev.isLocked && meta.role !== 'teacher') return null
			// "before and after": a move must not take the shape somewhere the session may not write
			return canWriteShape(session, next, get) ? next : null
		},
	},
}
