import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { getDefaultTranslationLocale } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TldrawAppFileId } from './TldrawAppFile'
import { idValidator } from './idValidator'

export interface TldrawAppUser extends BaseRecord<'user', RecordId<TldrawAppUser>> {
	ownerId: TldrawAppUserId
	name: string
	email: string
	avatar: string
	color: string
	exportFormat: 'png' | 'svg'
	exportTheme: 'dark' | 'light' | 'auto'
	exportBackground: boolean
	exportPadding: boolean
	createdAt: number
	updatedAt: number
	// Separate table for user presences?
	presence: {
		fileIds: TldrawAppFileId[]
	}
	flags: {
		placeholder_feature_flag: boolean
	}
	// N.B. These are duplicated from TLUserPreferences.
	locale?: string | null
	animationSpeed?: number | null
	edgeScrollSpeed?: number | null
	colorScheme?: 'light' | 'dark' | 'system'
	isSnapMode?: boolean | null
	isWrapMode?: boolean | null
	isDynamicSizeMode?: boolean | null
	isPasteAtCursorMode?: boolean | null
}

export const UserPreferencesKeys = [
	'locale',
	'animationSpeed',
	'edgeScrollSpeed',
	'colorScheme',
	'isSnapMode',
	'isWrapMode',
	'isDynamicSizeMode',
	'isPasteAtCursorMode',
] as const

export type TldrawAppUserId = RecordId<TldrawAppUser>

/** @public */
export const tldrawAppUserValidator: T.Validator<TldrawAppUser> = T.model(
	'user',
	T.object({
		typeName: T.literal('user'),
		id: idValidator<TldrawAppUserId>('user'),
		ownerId: idValidator<TldrawAppUserId>('user'),
		name: T.string,
		email: T.string,
		avatar: T.string,
		color: T.string,
		exportFormat: T.literalEnum('png', 'svg'),
		exportTheme: T.literalEnum('dark', 'light', 'auto'),
		exportBackground: T.boolean,
		exportPadding: T.boolean,
		createdAt: T.number,
		updatedAt: T.number,
		presence: T.object({
			fileIds: T.arrayOf(idValidator<TldrawAppFileId>('file')),
		}),
		flags: T.object({
			placeholder_feature_flag: T.boolean,
		}),
		// N.B. These are duplicated from TLUserPreferences.
		locale: T.string.nullable().optional(),
		animationSpeed: T.number.nullable().optional(),
		edgeScrollSpeed: T.number.nullable().optional(),
		colorScheme: T.literalEnum('light', 'dark', 'system').optional(),
		isSnapMode: T.boolean.nullable().optional(),
		isWrapMode: T.boolean.nullable().optional(),
		isDynamicSizeMode: T.boolean.nullable().optional(),
		isPasteAtCursorMode: T.boolean.nullable().optional(),
	})
)

/** @public */
export const tldrawAppUserVersions = createMigrationIds('com.tldraw.user', {} as const)

/** @public */
export const tldrawAppUserMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.user',
	recordType: 'user',
	sequence: [],
})

/** @public */
export const TldrawAppUserRecordType = createRecordType<TldrawAppUser>('user', {
	// validator: tldrawAppUserValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppUser, 'id' | 'typeName' | 'presence' | 'ownerId'> => ({
		name: 'Steve Ruiz',
		email: 'steve@tldraw.com',
		color: 'coral', // coral
		avatar: '',
		exportFormat: 'png',
		exportTheme: 'auto',
		exportBackground: true,
		exportPadding: true,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		flags: {
			placeholder_feature_flag: false,
		},
		// N.B. These are duplicated from TLUserPreferences.
		locale: getDefaultTranslationLocale(),
		animationSpeed: userPrefersReducedMotion() ? 0 : 1,
		edgeScrollSpeed: 1,
		colorScheme: 'system',
		isSnapMode: false,
		isWrapMode: false,
		isDynamicSizeMode: false,
		isPasteAtCursorMode: false,
	})
)

/** @internal */
export function userPrefersReducedMotion() {
	if (typeof window !== 'undefined' && 'matchMedia' in window) {
		return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
	}

	return false
}
