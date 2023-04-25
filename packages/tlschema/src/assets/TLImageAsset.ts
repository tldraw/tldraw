import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { createAssetValidator, TLBaseAsset } from './asset-validation'

// --- DEFINITION ---
/** @public */
export type TLImageAsset = TLBaseAsset<
	'image',
	{
		w: number
		h: number
		name: string
		isAnimated: boolean
		mimeType: string | null
		src: string | null
	}
>

// --- VALIDATION ---
/** @public */
export const imageAssetTypeValidator: T.Validator<TLImageAsset> = createAssetValidator(
	'image',
	T.object({
		w: T.number,
		h: T.number,
		name: T.string,
		isAnimated: T.boolean,
		mimeType: T.string.nullable(),
		src: T.string.nullable(),
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	AddIsAnimated: 1,
	RenameWidthHeight: 2,
} as const

/** @public */
export const imageAssetMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.RenameWidthHeight,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {
		[Versions.AddIsAnimated]: {
			up: (asset) => {
				return {
					...asset,
					props: {
						...asset.props,
						isAnimated: false,
					},
				}
			},
			down: (asset) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { isAnimated, ...rest } = asset.props
				return {
					...asset,
					props: rest,
				}
			},
		},
		[Versions.RenameWidthHeight]: {
			up: (asset) => {
				const { width, height, ...others } = asset.props
				return { ...asset, props: { w: width, h: height, ...others } }
			},
			down: (asset) => {
				const { w, h, ...others } = asset.props
				return { ...asset, props: { width: w, height: h, ...others } }
			},
		},
	},
})
