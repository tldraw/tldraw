import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { uniqueId } from 'tldraw'
import { TldrawAppUserId } from './TldrawAppUser'
import { idValidator } from './idValidator'

export interface TldrawAppFile extends BaseRecord<'file', RecordId<TldrawAppFile>> {
	name: string
	ownerId: TldrawAppUserId
	thumbnail: string
	shared: boolean
	sharedLinkType: 'view' | 'edit'
	published: boolean
	publishedSlug: string
	createdAt: number
	updatedAt: number
	isEmpty: boolean
}

export type TldrawAppFileId = RecordId<TldrawAppFile>

/** @public */
export const tldrawAppFileValidator: T.Validator<TldrawAppFile> = T.model(
	'user',
	T.object({
		typeName: T.literal('file'),
		id: idValidator<TldrawAppFileId>('file'),
		name: T.string,
		ownerId: idValidator<TldrawAppUserId>('user'),
		shared: T.boolean,
		sharedLinkType: T.or(T.literal('view'), T.literal('edit')),
		published: T.boolean,
		publishedSlug: T.string,
		thumbnail: T.string,
		createdAt: T.number,
		updatedAt: T.number,
		isEmpty: T.boolean,
	})
)

/** @public */
export const tldrawAppFileVersions = createMigrationIds('com.tldraw.file', {
	AddPublishing: 1,
} as const)

/** @public */
export const tldrawAppFileMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.file',
	recordType: 'file',
	sequence: [
		{
			id: tldrawAppFileVersions.AddPublishing,
			up: (file: any) => {
				file.published = false
				file.publishedSlug = uniqueId()
			},
			down(file: any) {
				delete file.published
				delete file.publishedSlug
			},
		},
	],
})

/** @public */
export const TldrawAppFileRecordType = createRecordType<TldrawAppFile>('file', {
	validator: tldrawAppFileValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppFile, 'id' | 'typeName' | 'ownerId'> => ({
		name: '',
		thumbnail: '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		isEmpty: false,
		shared: false,
		sharedLinkType: 'edit',
		published: false,
		publishedSlug: uniqueId(),
	})
)
