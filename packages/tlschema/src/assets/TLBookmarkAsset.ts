import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAsset } from '../records/TLAsset'
import { TLBaseAsset, createAssetValidator } from './TLBaseAsset'

/**
 * An asset used for URL bookmarks, used by the TLBookmarkShape.
 *
 *  @public */
export type TLBookmarkAsset = TLBaseAsset<
	'bookmark',
	{
		title: string
		description: string
		image: string
		favicon: string
		src: string | null
	}
>

/**
 * Validator for TLBookmarkAsset records. Validates the structure and data types
 * of bookmark asset properties including title, description, image, favicon, and source URL.
 *
 * @example
 * ```ts
 * const bookmarkData = {
 *   id: 'asset:bookmark1',
 *   typeName: 'asset',
 *   type: 'bookmark',
 *   props: {
 *     title: 'Example Website',
 *     description: 'A great example site',
 *     image: 'https://example.com/preview.jpg',
 *     favicon: 'https://example.com/favicon.ico',
 *     src: 'https://example.com'
 *   }
 * }
 *
 * const isValid = bookmarkAssetValidator.isValid(bookmarkData)
 * ```
 *
 * @public
 */
export const bookmarkAssetValidator: T.Validator<TLBookmarkAsset> = createAssetValidator(
	'bookmark',
	T.object({
		title: T.string,
		description: T.string,
		image: T.string,
		favicon: T.string,
		src: T.srcUrl.nullable(),
	})
)

const Versions = createMigrationIds('com.tldraw.asset.bookmark', {
	MakeUrlsValid: 1,
	AddFavicon: 2,
} as const)

/**
 * Migration version identifiers for bookmark assets. These versions track
 * the evolution of the bookmark asset schema over time.
 *
 * Available versions:
 * - `MakeUrlsValid` (v1): Ensures src URLs are valid or empty
 * - `AddFavicon` (v2): Adds favicon property to bookmark assets
 *
 * @example
 * ```ts
 * import { bookmarkAssetVersions } from '@tldraw/tlschema'
 *
 * // Check if a migration exists
 * console.log(bookmarkAssetVersions.AddFavicon) // 2
 * ```
 *
 * @public
 */
export { Versions as bookmarkAssetVersions }

/**
 * Migration sequence for bookmark assets. Handles the evolution of bookmark asset
 * data structure over time, ensuring backward and forward compatibility.
 *
 * The migration sequence includes:
 * 1. **MakeUrlsValid** (v1): Validates and cleans up src URLs, setting invalid URLs to empty string
 * 2. **AddFavicon** (v2): Adds the favicon property and validates it, setting invalid favicons to empty string
 *
 * @public
 */
export const bookmarkAssetMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.asset.bookmark',
	recordType: 'asset',
	filter: (asset) => (asset as TLAsset).type === 'bookmark',
	sequence: [
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
			id: Versions.AddFavicon,
			up: (asset: any) => {
				if (!T.srcUrl.isValid(asset.props.favicon)) {
					asset.props.favicon = ''
				}
			},
			down: (asset: any) => {
				delete asset.props.favicon
			},
		},
	],
})
