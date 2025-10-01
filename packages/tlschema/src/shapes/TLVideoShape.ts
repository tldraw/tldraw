import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLVideoShapeProps {
	w: number
	h: number
	time: number
	playing: boolean
	autoplay: boolean
	url: string
	assetId: TLAssetId | null
	altText: string
}

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

/** @public */
export const videoShapeProps: RecordProps<TLVideoShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	time: T.number,
	playing: T.boolean,
	autoplay: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	altText: T.string,
}

const Versions = createShapePropsMigrationIds('video', {
	AddUrlProp: 1,
	MakeUrlsValid: 2,
	AddAltText: 3,
	AddAutoplay: 4,
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
			down: 'retired',
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
			id: Versions.AddAltText,
			up: (props) => {
				props.altText = ''
			},
			down: (props) => {
				delete props.altText
			},
		},
		{
			id: Versions.AddAutoplay,
			up: (props) => {
				props.autoplay = true
			},
			down: (props) => {
				delete props.autoplay
			},
		},
	],
})
