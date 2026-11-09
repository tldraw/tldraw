import { CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// SPIKE: a role grant, a record in the room's object store. The server writes it from its own
// auth; clients read their own grant and cannot write it.
export interface TLAccessGrant {
	id: string
	typeName: 'access-grant'
	userId: string
	role: 'teacher' | 'student'
	meta: Record<string, unknown>
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
		userId: T.string,
		role: T.literalEnum('teacher', 'student'),
		meta: T.jsonValue,
	}),
}

export const accessGrantSchemaRecords = { 'access-grant': accessGrantRecordConfig }

// Stable identity: useSync recreates its store when `records` changes.
