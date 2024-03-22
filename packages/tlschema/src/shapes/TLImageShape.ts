import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { vecModelValidator } from '../misc/geometry-types'
import { createShapePropsMigrations } from '../records/TLShape'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const ImageShapeCrop = T.object({
	topLeft: vecModelValidator,
	bottomRight: vecModelValidator,
})
/** @public */
export type TLImageShapeCrop = T.TypeOf<typeof ImageShapeCrop>

/** @public */
export const imageShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
}

/** @public */
export type TLImageShapeProps = ShapePropsType<typeof imageShapeProps>

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

const Versions = {
	AddUrlProp: 1,
	AddCropProp: 2,
	MakeUrlsValid: 3,
} as const

/** @internal */
export const imageShapeMigrations = createShapePropsMigrations({
	sequence: [
		{
			version: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: (props) => {
				delete props.url
			},
		},
		{
			version: Versions.AddCropProp,
			up: (props) => {
				props.crop = null
			},
			down: (props) => {
				delete props.crop
			},
		},
		{
			version: Versions.MakeUrlsValid,
			up: (props) => {
				if (!T.linkUrl.isValid(props.url)) {
					props.url = ''
				}
			},
			down: (_props) => {
				// noop
			},
		},
	],
})
