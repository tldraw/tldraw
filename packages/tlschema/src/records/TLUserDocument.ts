import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { instanceIdValidator, TLInstance } from './TLInstance'
import { pageIdValidator, TLPage } from './TLPage'

/**
 * TLUserDocument
 *
 * Settings that apply to this document for only the specified user
 *
 * @public
 */
export interface TLUserDocument extends BaseRecord<'user_document', TLUserDocumentId> {
	isPenMode: boolean
	isGridMode: boolean
	isMobileMode: boolean
	isSnapMode: boolean
	lastUpdatedPageId: ID<TLPage> | null
	lastUsedTabId: ID<TLInstance> | null
}

/** @public */
export type TLUserDocumentId = ID<TLUserDocument>

/** @internal */
export const userDocumentValidator: T.Validator<TLUserDocument> = T.model(
	'user_document',
	T.object({
		typeName: T.literal('user_document'),
		id: idValidator<TLUserDocumentId>('user_document'),
		isPenMode: T.boolean,
		isGridMode: T.boolean,
		isMobileMode: T.boolean,
		isSnapMode: T.boolean,
		lastUpdatedPageId: pageIdValidator.nullable(),
		lastUsedTabId: instanceIdValidator.nullable(),
	})
)

export const Versions = {
	AddSnapMode: 1,
	AddMissingIsMobileMode: 2,
	RemoveIsReadOnly: 3,
	RemoveUserIdAndIsDarkMode: 4,
} as const

/** @internal */
export { Versions as userDocumentVersions }

/** @internal */
export const userDocumentMigrations = defineMigrations({
	currentVersion: Versions.RemoveUserIdAndIsDarkMode,
	migrators: {
		[Versions.AddSnapMode]: {
			up: (userDocument: TLUserDocument) => {
				return { ...userDocument, isSnapMode: false }
			},
			down: ({ isSnapMode: _, ...userDocument }: TLUserDocument) => {
				return userDocument
			},
		},
		[Versions.AddMissingIsMobileMode]: {
			up: (userDocument: TLUserDocument) => {
				return { ...userDocument, isMobileMode: userDocument.isMobileMode ?? false }
			},
			down: ({ isMobileMode: _, ...userDocument }: TLUserDocument) => {
				return userDocument
			},
		},
		[Versions.RemoveIsReadOnly]: {
			up: ({ isReadOnly: _, ...userDocument }: TLUserDocument & { isReadOnly: boolean }) => {
				return userDocument
			},
			down: (userDocument: TLUserDocument) => {
				return { ...userDocument, isReadOnly: false }
			},
		},
		[Versions.RemoveUserIdAndIsDarkMode]: {
			up: ({
				userId: _,
				isDarkMode: __,
				...userDocument
			}: TLUserDocument & { userId: string; isDarkMode: boolean }) => {
				return userDocument
			},
			down: (userDocument: TLUserDocument) => {
				return { ...userDocument, userId: 'user:none', isDarkMode: false }
			},
		},
	},
})

/** @internal */
export const UserDocumentRecordType = createRecordType<TLUserDocument>('user_document', {
	migrations: userDocumentMigrations,
	validator: userDocumentValidator,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLUserDocument, 'id' | 'typeName' | 'userId'> => ({
		isPenMode: false,
		isGridMode: false,
		isMobileMode: false,
		isSnapMode: false,
		lastUpdatedPageId: null,
		lastUsedTabId: null,
	})
)
