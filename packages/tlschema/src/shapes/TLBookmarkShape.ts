import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/**
 * Properties for the bookmark shape, which displays website bookmarks as interactive cards.
 *
 * @public
 */
export interface TLBookmarkShapeProps {
	/** Width of the bookmark shape in pixels */
	w: number
	/** Height of the bookmark shape in pixels */
	h: number
	/** Asset ID for the bookmark's preview image, or null if no image is available */
	assetId: TLAssetId | null
	/** The URL that this bookmark points to */
	url: string
}

/**
 * A bookmark shape represents a website link with optional preview content.
 * Bookmark shapes display as cards showing the page title, description, and preview image.
 *
 * @public
 * @example
 * ```ts
 * const bookmarkShape: TLBookmarkShape = {
 *   id: createShapeId(),
 *   typeName: 'shape',
 *   type: 'bookmark',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:page1',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     w: 300,
 *     h: 320,
 *     assetId: 'asset:bookmark123',
 *     url: 'https://www.example.com'
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>

/**
 * Validation schema for bookmark shape properties.
 *
 * @public
 * @example
 * ```ts
 * // Validates bookmark shape properties
 * const isValid = bookmarkShapeProps.url.isValid('https://example.com')
 * ```
 */
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

/**
 * Version identifiers for bookmark shape migrations.
 *
 * @public
 */
export { Versions as bookmarkShapeVersions }

/**
 * Migration sequence for bookmark shape properties across different schema versions.
 * Handles backwards compatibility when bookmark shape structure changes.
 *
 * @public
 */
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
