import { defineMigrations } from '@tldraw/store'

import { TypeValidator, boolean, nonZeroNumber, number, object, string } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

/** @public */
export type TLVideoShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	time: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
}

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

/** @internal */
export const videoShapeValidator: TypeValidator<TLVideoShape> = createShapeValidator(
	'video',
	object({
		opacity: opacityValidator,
		w: nonZeroNumber,
		h: nonZeroNumber,
		time: number,
		playing: boolean,
		url: string,
		assetId: assetIdValidator.nullable(),
	})
)

const Versions = {
	AddUrlProp: 1,
} as const

/** @internal */
export const videoShapeMigrations = defineMigrations({
	currentVersion: Versions.AddUrlProp,
	migrators: {
		[Versions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
	},
})
