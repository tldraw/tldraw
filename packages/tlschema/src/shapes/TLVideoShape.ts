import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import {
	RETIRED_DOWN_MIGRATION,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
} from '../records/TLShape'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const videoShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	time: T.number,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
}

/** @public */
export type TLVideoShapeProps = ShapePropsType<typeof videoShapeProps>

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

const Versions = createShapePropsMigrationIds('video', {
	AddUrlProp: 1,
	MakeUrlsValid: 2,
})

export { Versions as videoShapeVersions }

/** @public */
export const videoShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: RETIRED_DOWN_MIGRATION,
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
