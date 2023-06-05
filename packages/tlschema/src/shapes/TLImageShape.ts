import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { Vec2dModel } from '../misc/geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

/** @public */
export type TLImageCrop = {
	topLeft: Vec2dModel
	bottomRight: Vec2dModel
}

/** @public */
export type TLImageShapeProps = {
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
export const cropValidator = T.object({
	topLeft: T.point,
	bottomRight: T.point,
})

/** @internal */
export const imageShapePropsValidators = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.string,
	assetId: assetIdValidator.nullable(),
	crop: cropValidator.nullable(),
}

/** @internal */
export const imageShapeValidator: T.Validator<TLImageShape> = createShapeValidator(
	'image',
	T.object(imageShapePropsValidators)
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
