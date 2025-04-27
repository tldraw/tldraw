import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLBookmarkShapeProps {
	w: number
	h: number
	assetId: TLAssetId | null
	url: string
}

/** @public */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>

/** @public */
export const bookmarkShapeProps: RecordProps<TLBookmarkShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	assetId: assetIdValidator.nullable(),
	url: T.linkUrl,
}

const Versions = createShapePropsMigrationIds('bookmark', {
	NullAssetId: 1,
	MakeUrlsValid: 2,
})

export { Versions as bookmarkShapeVersions }

/** @public */
export const bookmarkShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.NullAssetId,
			up: (props) => {
				if (props.assetId === undefined) {
					props.assetId = null
				}
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
	],
})
