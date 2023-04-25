import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { createAssetValidator, TLBaseAsset } from './asset-validation'

// --- DEFINITION ---
/** @public */
export type TLBookmarkAsset = TLBaseAsset<
	'bookmark',
	{
		title: string
		description: string
		image: string
		src: string | null
	}
>

// --- VALIDATION ---
/** @public */
export const bookmarkAssetTypeValidator: T.Validator<TLBookmarkAsset> = createAssetValidator(
	'bookmark',
	T.object({
		title: T.string,
		description: T.string,
		image: T.string,
		src: T.string.nullable(),
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const bookmarkAssetMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {},
})
