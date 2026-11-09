import { CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// SPIKE: a role, as a record in the file room's object store. The server writes it from its own
// auth. The room's rule and the client both read it. Clients cannot write it.
export interface TLAccessGrant {
	id: string
	typeName: 'access-grant'
	role: 'teacher' | 'student'
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
		role: T.literalEnum('teacher', 'student'),
		// rooms written earlier still hold these; nothing reads them
		userId: T.string.optional(),
		meta: T.jsonValue.optional(),
	}),
}

// SPIKE: what students may do, in its own record so it does not travel with the document's
// own settings or page records. Teachers write it; students cannot.
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

// Stable identity: useSync recreates its store when `records` changes.
