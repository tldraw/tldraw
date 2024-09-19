import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAsset } from '../records/TLAsset'
import { TLBaseAsset, createAssetValidator } from './TLBaseAsset'

/**
 * An asset used for videos, used by the TLVideoShape.
 *
 * @public */
export type TLVideoAsset = TLBaseAsset<
	'video',
	{
		w: number
		h: number
		name: string
		isAnimated: boolean
		mimeType: string | null
		src: string | null
		fileSize?: number
	}
>

/** @public */
export const videoAssetValidator: T.Validator<TLVideoAsset> = createAssetValidator(
	'video',
	T.object({
		w: T.number,
		h: T.number,
		name: T.string,
		isAnimated: T.boolean,
		mimeType: T.string.nullable(),
		src: T.srcUrl.nullable(),
		fileSize: T.number.optional(),
	})
)

const Versions = createMigrationIds('com.tldraw.asset.video', {
	AddIsAnimated: 1,
	RenameWidthHeight: 2,
	MakeUrlsValid: 3,
	AddFileSize: 4,
	MakeFileSizeOptional: 5,
} as const)

export { Versions as videoAssetVersions }

/** @public */
export const videoAssetMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.asset.video',
	recordType: 'asset',
	filter: (asset) => (asset as TLAsset).type === 'video',
	sequence: [
		{
			id: Versions.AddIsAnimated,
			up: (asset: any) => {
				asset.props.isAnimated = false
			},
			down: (asset: any) => {
				delete asset.props.isAnimated
			},
		},
		{
			id: Versions.RenameWidthHeight,
			up: (asset: any) => {
				asset.props.w = asset.props.width
				asset.props.h = asset.props.height
				delete asset.props.width
				delete asset.props.height
			},
			down: (asset: any) => {
				asset.props.width = asset.props.w
				asset.props.height = asset.props.h
				delete asset.props.w
				delete asset.props.h
			},
		},
		{
			id: Versions.MakeUrlsValid,
			up: (asset: any) => {
				if (!T.srcUrl.isValid(asset.props.src)) {
					asset.props.src = ''
				}
			},
			down: (_asset) => {
				// noop
			},
		},
		{
			id: Versions.AddFileSize,
			up: (asset: any) => {
				asset.props.fileSize = -1
			},
			down: (asset: any) => {
				delete asset.props.fileSize
			},
		},
		{
			id: Versions.MakeFileSizeOptional,
			up: (asset: any) => {
				if (asset.props.fileSize === -1) {
					asset.props.fileSize = undefined
				}
			},
			down: (asset: any) => {
				if (asset.props.fileSize === undefined) {
					asset.props.fileSize = -1
				}
			},
		},
	],
})
