import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { vecModelValidator } from '../misc/geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLShapeCrop } from './ShapeWithCrop'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export const ImageShapeCrop: T.ObjectValidator<TLShapeCrop> = T.object({
	topLeft: vecModelValidator,
	bottomRight: vecModelValidator,
	isCircle: T.boolean.optional(),
})

/** @public */
export interface TLImageShapeProps {
	w: number
	h: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
	crop: TLShapeCrop | null
	flipX: boolean
	flipY: boolean
	altText: string
}

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

/** @public */
export const imageShapeProps: RecordProps<TLImageShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
	altText: T.string,
}

const Versions = createShapePropsMigrationIds('image', {
	AddUrlProp: 1,
	AddCropProp: 2,
	MakeUrlsValid: 3,
	AddFlipProps: 4,
	AddAltText: 5,
})

export { Versions as imageShapeVersions }

/** @public */
export const imageShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: 'retired',
		},
		{
			id: Versions.AddCropProp,
			up: (props) => {
				props.crop = null
			},
			down: (props) => {
				delete props.crop
			},
		},
		{
			id: Versions.MakeUrlsValid,
			up: (props) => {
				if (!T.linkUrl.isValid(props.url)) {
					props.url = ''
				}
			},
			down: (_props) => {
				// noop
			},
		},
		{
			id: Versions.AddFlipProps,
			up: (props) => {
				props.flipX = false
				props.flipY = false
			},
			down: (props) => {
				delete props.flipX
				delete props.flipY
			},
		},
		{
			id: Versions.AddAltText,
			up: (props) => {
				props.altText = ''
			},
			down: (props) => {
				delete props.altText
			},
		},
	],
})
