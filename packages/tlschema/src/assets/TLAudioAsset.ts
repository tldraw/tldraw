import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { RecordProps } from '../recordsWithProps'
import { TLBaseAsset, createAssetValidator } from './TLBaseAsset'

/**
 * An asset record representing audio files that can be played in audio shapes.
 *
 * @public
 */
export type TLAudioAsset = TLBaseAsset<
	'audio',
	{
		w: number
		h: number
		name: string
		isAnimated: boolean
		mimeType: string | null
		src: string | null
		fileSize?: number
		title?: string
		coverArt?: string
	}
>

/** @public */
export const audioAssetProps = {
	w: T.number,
	h: T.number,
	name: T.string,
	isAnimated: T.boolean,
	mimeType: T.string.nullable(),
	src: T.srcUrl.nullable(),
	fileSize: T.number.optional(),
	title: T.string.optional(),
	coverArt: T.string.optional(),
} satisfies RecordProps<TLAudioAsset>

/** @public */
export const audioAssetValidator: T.Validator<TLAudioAsset> = createAssetValidator(
	'audio',
	T.object(audioAssetProps)
)

const Versions = createMigrationIds('com.tldraw.asset.audio', {} as const)

export { Versions as audioAssetVersions }

/** @public */
export const audioAssetMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.asset.audio',
	recordType: 'asset',
	filter: (asset) => (asset as TLAudioAsset).type === 'audio',
	sequence: [],
})
