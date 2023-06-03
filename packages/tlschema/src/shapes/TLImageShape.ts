import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { Vec2dModel } from '../geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType } from '../style-types'
import { assetIdValidator, opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

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
export const cropValidator = T.object({
	topLeft: T.point,
	bottomRight: T.point,
})

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

/** @public */
export const imageShapeTypeValidator: T.Validator<TLImageShape> = createShapeValidator(
	'image',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		playing: T.boolean,
		url: T.string,
		assetId: assetIdValidator.nullable(),
		crop: cropValidator.nullable(),
	})
)

const Versions = {
	AddUrlProp: 1,
	AddCropProp: 2,
} as const

/** @public */
export const imageShapeTypeMigrations = defineMigrations({
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
