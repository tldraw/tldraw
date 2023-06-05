import { defineMigrations } from '@tldraw/store'

import {
	booleanValidator,
	numberValidator,
	objectValidator,
	stringValidator,
	TypeValidator,
} from '@tldraw/validate'
import { createAssetValidator, TLBaseAsset } from './TLBaseAsset'

/**
 * An asset used for videos, used by the TLVideoShape.
 *
 * @public */
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

/** @internal */
export const videoAssetValidator: TypeValidator<TLVideoAsset> = createAssetValidator(
	'video',
	objectValidator({
		w: numberValidator,
		h: numberValidator,
		name: stringValidator,
		isAnimated: booleanValidator,
		mimeType: stringValidator.nullable(),
		src: stringValidator.nullable(),
	})
)

const Versions = {
	AddIsAnimated: 1,
	RenameWidthHeight: 2,
} as const

/** @internal */
export const videoAssetMigrations = defineMigrations({
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
