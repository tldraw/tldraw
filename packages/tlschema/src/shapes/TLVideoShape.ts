import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { RETIRED_DOWN_MIGRATION, createShapePropsMigrations } from '../records/TLShape'
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

const Versions = {
	AddUrlProp: 1,
	MakeUrlsValid: 2,
} as const

/** @internal */
export const videoShapeMigrations = createShapePropsMigrations({
	sequence: [
		{
			version: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: RETIRED_DOWN_MIGRATION,
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
