import { defineMigrations } from '@tldraw/store'

import { boolean, number, object, string, TypeValidator } from '@tldraw/validate'
import { createAssetValidator, TLBaseAsset } from './TLBaseAsset'

/**
 * An asset for images such as PNGs and JPEGs, used by the TLImageShape.
 *
 * @public */
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

/** @internal */
export const imageAssetValidator: TypeValidator<TLImageAsset> = createAssetValidator(
	'image',
	object({
		w: number,
		h: number,
		name: string,
		isAnimated: boolean,
		mimeType: string.nullable(),
		src: string.nullable(),
	})
)

const Versions = {
	AddIsAnimated: 1,
	RenameWidthHeight: 2,
} as const

/** @internal */
export const imageAssetMigrations = defineMigrations({
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
