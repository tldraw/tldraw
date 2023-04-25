import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { pageIdValidator } from '../validation'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page'> {
	name: string
	index: string
}

/** @public */
export type TLPageId = ID<TLPage>

// --- VALIDATION ---
/** @public */
export const pageTypeValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.string,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const pageTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {},
})

/** @public */
export const TLPage = createRecordType<TLPage>('page', {
	migrations: pageTypeMigrations,
	validator: pageTypeValidator,
})
