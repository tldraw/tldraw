import type { FocusColor } from '@tldraw/fairy-shared'
import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	T,
} from 'tldraw'
import type { FaeProjectMember } from './fae-validators'
import { faeProjectMemberValidator, focusColorValidator } from './fae-validators'

interface FaeProjectRecord extends BaseRecord<'fairy-project', FaeProjectId> {
	title: string
	description: string
	color: FocusColor
	members: FaeProjectMember[]
	plan: string
}

export type FaeProjectId = RecordId<FaeProjectRecord>

const faeProjectValidator = T.object<FaeProjectRecord>({
	id: idValidator<FaeProjectId>('fairy-project'),
	typeName: T.literal('fairy-project'),
	title: T.string,
	description: T.string,
	color: focusColorValidator,
	members: T.arrayOf(faeProjectMemberValidator),
	plan: T.string,
})

export const faeProjectMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.fairy-project',
	recordType: 'fairy-project',
	sequence: [],
})

export const faeProjectRecordType = createRecordType<FaeProjectRecord>('fairy-project', {
	validator: faeProjectValidator,
	scope: 'session',
})
