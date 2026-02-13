import {
	AssetRecordType,
	Editor,
	Result,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLShapePartial,
	createShapeId,
	debounce,
	getHashForString,
} from '@tldraw/editor'

export const BOOKMARK_WIDTH = 300
export const BOOKMARK_HEIGHT = 320
export const BOOKMARK_JUST_URL_HEIGHT = 46
const SHORT_BOOKMARK_HEIGHT = 101

export function getBookmarkHeight(editor: Editor, assetId?: TLAssetId | null) {
	const asset = (assetId ? editor.getAsset(assetId) : null) as TLBookmarkAsset | null

	if (asset) {
		if (!asset.props.image) {
			if (!asset.props.title) {
				return BOOKMARK_JUST_URL_HEIGHT
			} else {
				return SHORT_BOOKMARK_HEIGHT
			}
		}
	}

	return BOOKMARK_HEIGHT
}

export function setBookmarkHeight(editor: Editor, shape: TLBookmarkShape) {
	return {
		...shape,
		props: { ...shape.props, h: getBookmarkHeight(editor, shape.props.assetId) },
	}
}

/** @internal */
export const getHumanReadableAddress = (url: string) => {
	try {
		const objUrl = new URL(url)
		// we want the hostname without any www
		return objUrl.hostname.replace(/^www\./, '')
	} catch {
		return url
	}
}

export function updateBookmarkAssetOnUrlChange(editor: Editor, shape: TLBookmarkShape) {
	const { url } = shape.props

	// Derive the asset id from the URL
	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

	if (editor.getAsset(assetId)) {
		// Existing asset for this URL?
		if (shape.props.assetId !== assetId) {
			editor.updateShapes([
				{
					id: shape.id,
					type: shape.type,
					props: { assetId },
				},
			])
		}
	} else {
		// No asset for this URL?

		// First, clear out the existing asset reference
		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: { assetId: null },
			},
		])

		// Then try to asyncronously create a new one
		createBookmarkAssetOnUrlChange(editor, shape)
	}
}

const createBookmarkAssetOnUrlChange = debounce(async (editor: Editor, shape: TLBookmarkShape) => {
	if (editor.isDisposed) return

	const { url } = shape.props

	// Create the asset using the external content manager's createAssetFromUrl method.
	// This may be overwritten by the user (for example, we overwrite it on tldraw.com)
	const asset = await editor.getAssetForExternalContent({ type: 'url', url })

	if (!asset) {
		// No asset? Just leave the bookmark as a null assetId.
		return
	}

	editor.run(() => {
		// Create the new asset
		editor.createAssets([asset])

		// And update the shape
		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: { assetId: asset.id },
			},
		])
	})
}, 500)

/**
 * Creates a bookmark shape from a URL with unfurled metadata.
 *
 * @returns A Result containing the created bookmark shape or an error
 * @public
 */

export async function createBookmarkFromUrl(
	editor: Editor,
	{
		url,
		center = editor.getViewportPageBounds().center,
	}: {
		url: string
		center?: { x: number; y: number }
	}
): Promise<Result<TLBookmarkShape, string>> {
	try {
		// Create the bookmark asset with unfurled metadata
		const asset = await editor.getAssetForExternalContent({ type: 'url', url })

		// Create the bookmark shape
		const shapeId = createShapeId()
		const shapePartial: TLShapePartial<TLBookmarkShape> = {
			id: shapeId,
			type: 'bookmark',
			x: center.x - BOOKMARK_WIDTH / 2,
			y: center.y - BOOKMARK_HEIGHT / 2,
			rotation: 0,
			opacity: 1,
			props: {
				url,
				assetId: asset?.id || null,
				w: BOOKMARK_WIDTH,
				h: getBookmarkHeight(editor, asset?.id),
			},
		}

		editor.run(() => {
			// Create the asset if we have one
			if (asset) {
				editor.createAssets([asset])
			}

			// Create the shape
			editor.createShapes([shapePartial])
		})

		// Get the created shape
		const createdShape = editor.getShape(shapeId) as TLBookmarkShape
		return Result.ok(createdShape)
	} catch (error) {
		return Result.err(error instanceof Error ? error.message : 'Failed to create bookmark')
	}
}
