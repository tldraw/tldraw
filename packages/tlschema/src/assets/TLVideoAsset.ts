import { Migrator } from '@tldraw/tlstore'
import { TLBaseAsset } from './asset-validation'

// --- DEFINITION ---
// TODO: figure out what is actually being used
/** @public */
export type TLVideoAsset = TLBaseAsset<
	'video',
	{
		w: number
		h: number
		name: string
		isAnimated: boolean
		mimeType: string | null
		src: string | null
	}
>

const Versions = {
	AddIsAnimated: 1,
	RenameWidthHeight: 2,
} as const

/** @public */
export const videoAssetMigrator = new Migrator({
	currentVersion: Versions.RenameWidthHeight,
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
