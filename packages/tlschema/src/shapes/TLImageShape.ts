import { defineMigrations } from '@tldraw/store'

import {
	TypeValidator,
	booleanValidator,
	nonZeroNumberValidator,
	objectValidator,
	pointValidator,
	stringValidator,
} from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { Vec2dModel } from '../misc/geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

/** @public */
export type TLImageCrop = {
	topLeft: Vec2dModel
	bottomRight: Vec2dModel
}

/** @public */
export type TLImageShapeProps = {
	opacity: TLOpacityType
	url: string
	playing: boolean
	w: number
	h: number
	assetId: TLAssetId | null
	crop: TLImageCrop | null
}
/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

/** @internal */
export const cropValidator = objectValidator({
	topLeft: pointValidator,
	bottomRight: pointValidator,
})

/** @internal */
export const imageShapeValidator: TypeValidator<TLImageShape> = createShapeValidator(
	'image',
	objectValidator({
		opacity: opacityValidator,
		w: nonZeroNumberValidator,
		h: nonZeroNumberValidator,
		playing: booleanValidator,
		url: stringValidator,
		assetId: assetIdValidator.nullable(),
		crop: cropValidator.nullable(),
	})
)

const Versions = {
	AddUrlProp: 1,
	AddCropProp: 2,
} as const

/** @internal */
export const imageShapeMigrations = defineMigrations({
	currentVersion: Versions.AddCropProp,
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
		[Versions.AddCropProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, crop: null } }
			},
			down: (shape) => {
				const { crop: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
	},
})
