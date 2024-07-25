import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAsset } from '../records/TLAsset'
import { TLBaseAsset, createAssetValidator } from './TLBaseAsset'

/**
 * An asset used for audio, used by the TLAudioShape.
 *
 * @public */
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
export const audioAssetValidator: T.Validator<TLAudioAsset> = createAssetValidator(
	'audio',
	T.object({
		w: T.number,
		h: T.number,
		name: T.string,
		isAnimated: T.boolean,
		mimeType: T.string.nullable(),
		src: T.srcUrl.nullable(),
		fileSize: T.number.optional(),
		title: T.string.optional(),
		coverArt: T.string.optional(),
	})
)

const Versions = createMigrationIds('com.tldraw.asset.audio', {} as const)

export { Versions as audioAssetVersions }

/** @public */
export const audioAssetMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.asset.audio',
	recordType: 'asset',
	filter: (asset) => (asset as TLAsset).type === 'audio',
	sequence: [],
})
