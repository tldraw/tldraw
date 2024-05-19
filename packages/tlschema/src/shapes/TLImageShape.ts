import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { vecModelValidator } from '../misc/geometry-types'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

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
export type TLImageShapeProps = RecordPropsType<typeof imageShapeProps>

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

const Versions = createShapePropsMigrationIds('image', {
	AddUrlProp: 1,
	AddCropProp: 2,
	MakeUrlsValid: 3,
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
			down: RETIRED_DOWN_MIGRATION,
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
	],
})
