import { Migrator } from '@tldraw/tlstore'
import { Vec2dModel } from '../geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType } from '../style-types'
import { TLBaseShape } from './shape-validation'

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

const Versions = {
	AddUrlProp: 1,
	AddCropProp: 2,
} as const

/** @public */
export const imageShapeTypeMigrator = new Migrator({
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
