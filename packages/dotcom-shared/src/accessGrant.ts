import { CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// SPIKE: what a session can do, as a record in the file room's object store. `can` is a list of
// capabilities (see accessCan.ts) and `pages` the pages they apply to. The server writes teachers'
// grants from its own auth, and creates the students' grant empty; teachers edit that one.
// The room's rule and the client both read these, and nobody has a role.
export interface TLAccessGrant {
	id: string
	typeName: 'access-grant'
	can: string[]
	pages: string[]
}

export const ANONYMOUS_GRANT_USER = 'anonymous'

export function accessGrantId(userId: string | null | undefined) {
	return `access-grant:${userId || ANONYMOUS_GRANT_USER}`
}

export const accessGrantRecordConfig: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('access-grant'),
		can: T.arrayOf(T.string).optional(),
		pages: T.arrayOf(T.string).optional(),
		// rooms written earlier hold these; nothing reads them
		role: T.literalEnum('teacher', 'student').optional(),
		userId: T.string.optional(),
		meta: T.jsonValue.optional(),
	}),
}

// A stored grant, with what an older room may have left out filled in as nothing.
export function readGrant(record: unknown): TLAccessGrant | undefined {
	if (!record || typeof record !== 'object') return undefined
	const r = record as Partial<TLAccessGrant>
	if (r.typeName !== 'access-grant' || !r.id) return undefined
	return { id: r.id, typeName: 'access-grant', can: r.can ?? [], pages: r.pages ?? [] }
}

// SPIKE: the earlier students' policy record. Nothing reads it any more; it stays registered so
// rooms that still hold one load.
export interface TLAccessPolicy {
	id: string
	typeName: 'access-policy'
	studentsCanEditAll: boolean
	studentsRedOnly?: boolean
	studentPages: string[]
	meta: Record<string, unknown>
}

export const ACCESS_POLICY_ID = 'access-policy:file'

export const accessPolicyRecordConfig: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('access-policy'),
		studentsCanEditAll: T.boolean,
		studentsRedOnly: T.boolean.optional(),
		studentPages: T.arrayOf(T.string),
		meta: T.jsonValue,
	}),
}

export const accessGrantSchemaRecords = {
	'access-grant': accessGrantRecordConfig,
	'access-policy': accessPolicyRecordConfig,
}
