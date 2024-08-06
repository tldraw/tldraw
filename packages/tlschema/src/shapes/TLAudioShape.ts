import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLAudioShapeProps {
	w: number
	h: number
	time: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
}

/** @public */
export type TLAudioShape = TLBaseShape<'audio', TLAudioShapeProps>

/** @public */
export const audioShapeProps: RecordProps<TLAudioShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	time: T.number,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
}

const Versions = createShapePropsMigrationIds('audio', {})

export { Versions as audioShapeVersions }

/** @public */
export const audioShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
