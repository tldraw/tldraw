import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAsset } from '../records/TLAsset'
import { TLBaseAsset, createAssetValidator } from './TLBaseAsset'

/**
 * An asset record representing video files that can be displayed in video shapes.
 * Video assets store metadata about video files including dimensions, MIME type,
 * animation status, and file source information. They are referenced by TLVideoShape
 * instances to display video content on the canvas.
 *
 * @example
 * ```ts
 * import { TLVideoAsset } from '@tldraw/tlschema'
 *
 * const videoAsset: TLVideoAsset = {
 *   id: 'asset:video123',
 *   typeName: 'asset',
 *   type: 'video',
 *   props: {
 *     w: 1920,
 *     h: 1080,
 *     name: 'my-video.mp4',
 *     isAnimated: true,
 *     mimeType: 'video/mp4',
 *     src: 'https://example.com/video.mp4',
 *     fileSize: 5242880
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export type TLVideoAsset = TLBaseAsset<
	'video',
	{
		/** The width of the video in pixels */
		w: number
		/** The height of the video in pixels */
		h: number
		/** The original filename or display name of the video */
		name: string
		/** Whether the video contains animation/motion (true for most videos) */
		isAnimated: boolean
		/** The MIME type of the video file (e.g., 'video/mp4', 'video/webm'), null if unknown */
		mimeType: string | null
		/** The source URL or data URI for the video file, null if not yet available */
		src: string | null
		/** The file size in bytes, optional for backward compatibility */
		fileSize?: number
	}
>

/**
 * Runtime validator for TLVideoAsset records. This validator ensures that video asset
 * data conforms to the expected structure and types, providing type safety at runtime.
 * It validates dimensions, file metadata, and ensures URLs are properly formatted.
 *
 * @example
 * ```ts
 * import { videoAssetValidator } from '@tldraw/tlschema'
 *
 * // Validate a video asset object
 * const validAsset = videoAssetValidator.validate({
 *   id: 'asset:video123',
 *   typeName: 'asset',
 *   type: 'video',
 *   props: {
 *     w: 1920,
 *     h: 1080,
 *     name: 'video.mp4',
 *     isAnimated: true,
 *     mimeType: 'video/mp4',
 *     src: 'https://example.com/video.mp4',
 *     fileSize: 1024000
 *   },
 *   meta: {}
 * })
 * ```
 *
 * @public
 */
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

/**
 * Version identifiers for video asset migration sequences. These versions track
 * the evolution of the video asset schema over time, enabling proper data migration
 * when the asset structure changes.
 *
 * @example
 * ```ts
 * import { videoAssetVersions } from '@tldraw/tlschema'
 *
 * // Check the current version of a specific migration
 * console.log(videoAssetVersions.AddFileSize) // 4
 * ```
 *
 * @public
 */
export { Versions as videoAssetVersions }

/**
 * Migration sequence for video assets that handles schema evolution over time.
 * This sequence defines how video asset data should be transformed when upgrading
 * or downgrading between different schema versions. Each migration step handles
 * specific changes like adding properties, renaming fields, or changing data formats.
 *
 * The migrations handle:
 * - Adding animation detection (isAnimated property)
 * - Renaming width/height properties to w/h for consistency
 * - Ensuring URL validity for src properties
 * - Adding file size tracking
 * - Making file size optional for backward compatibility
 *
 * @public
 */
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
