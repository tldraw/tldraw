import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/**
 * Configuration interface defining properties for video shapes in tldraw.
 * Video shapes can display video content from URLs or asset references,
 * with controls for playback state, timing, and accessibility.
 *
 * @public
 * @example
 * ```ts
 * const videoProps: TLVideoShapeProps = {
 *   w: 640,
 *   h: 480,
 *   time: 0,
 *   playing: false,
 *   autoplay: true,
 *   url: 'https://example.com/video.mp4',
 *   assetId: 'asset:video123',
 *   altText: 'Educational video about shapes'
 * }
 * ```
 */
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

/**
 * A video shape that can display video content with playback controls and timing.
 * Video shapes support both direct URL references and asset-based video storage,
 * with accessibility features and playback state management.
 *
 * @public
 * @example
 * ```ts
 * const videoShape: TLVideoShape = {
 *   id: 'shape:video123',
 *   typeName: 'shape',
 *   type: 'video',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     w: 640,
 *     h: 480,
 *     time: 15.5,
 *     playing: false,
 *     autoplay: false,
 *     url: 'https://example.com/video.mp4',
 *     assetId: 'asset:video123',
 *     altText: 'Product demo video'
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

/**
 * Validation schema for video shape properties. This defines the runtime validation
 * rules that ensure video shape data integrity, including URL validation, numeric
 * constraints, and proper asset ID formatting.
 *
 * @public
 * @example
 * ```ts
 * import { videoShapeProps } from '@tldraw/tlschema'
 *
 * // Validate video URL
 * const isValidUrl = videoShapeProps.url.isValid('https://example.com/video.mp4')
 * const isValidTime = videoShapeProps.time.isValid(42.5)
 *
 * if (isValidUrl && isValidTime) {
 *   // Video properties are valid
 * }
 * ```
 */
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

/**
 * Version identifiers for video shape migrations. These constants track
 * the evolution of the video shape schema over time.
 *
 * @public
 * @example
 * ```ts
 * import { videoShapeVersions } from '@tldraw/tlschema'
 *
 * // Check if shape data needs migration
 * if (shapeVersion < videoShapeVersions.AddAltText) {
 *   // Apply alt text migration for accessibility
 * }
 * ```
 */
export { Versions as videoShapeVersions }

/**
 * Migration sequence for video shape schema evolution. This handles transforming
 * video shape data between different versions as the schema evolves over time.
 *
 * Key migrations include:
 * - AddUrlProp: Added URL property for direct video links
 * - MakeUrlsValid: Ensured all URLs conform to link URL validation
 * - AddAltText: Added accessibility support with alternative text
 * - AddAutoplay: Added autoplay control for video playback
 *
 * @public
 */
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
