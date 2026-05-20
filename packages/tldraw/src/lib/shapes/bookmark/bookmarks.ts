import {
	AssetRecordType,
	Editor,
	Result,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLShapeId,
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

async function _createBookmarkAssetOnUrlChange(editor: Editor, shape: TLBookmarkShape) {
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
}

const bookmarkDebouncers = new WeakMap<
	Editor,
	ReturnType<typeof debounce<[Editor, TLBookmarkShape], void>>
>()

function createBookmarkAssetOnUrlChange(editor: Editor, shape: TLBookmarkShape) {
	let fn = bookmarkDebouncers.get(editor)
	if (!fn) {
		fn = debounce(_createBookmarkAssetOnUrlChange, 500)
		bookmarkDebouncers.set(editor, fn)
	}
	fn(editor, shape)
}

/**
 * Creates a bookmark shape from a URL.
 *
 * The shape is created immediately as a placeholder so the user gets visible
 * feedback at the paste location, and the bookmark metadata (title, description,
 * image, favicon) is fetched in the background. Once metadata resolves, the
 * shape is patched with the resulting asset. If the fetch fails, the shape is
 * left as a URL-only bookmark.
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
		// If we already have a bookmark asset for this URL (e.g. another bookmark
		// shape was created from the same URL earlier), use it immediately rather
		// than re-fetching.
		const expectedAssetId: TLAssetId = AssetRecordType.createId(getHashForString(url))
		const existingAsset = editor.getAsset(expectedAssetId) as TLBookmarkAsset | null

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
				assetId: existingAsset?.id ?? null,
				w: BOOKMARK_WIDTH,
				h: getBookmarkHeight(editor, existingAsset?.id),
			},
		}

		editor.run(() => {
			editor.createShapes([shapePartial])
		})

		const createdShape = editor.getShape<TLBookmarkShape>(shapeId)
		if (!createdShape) {
			return Result.err('Failed to create bookmark shape')
		}

		// If we already had the asset, we're done — no metadata fetch needed.
		if (existingAsset) {
			return Result.ok(createdShape)
		}

		// Otherwise kick off the metadata fetch in the background. The shape is
		// already visible as a placeholder; once the asset resolves we'll patch
		// the shape with its assetId.
		void hydrateBookmarkShape(editor, shapeId, url)

		return Result.ok(createdShape)
	} catch (error) {
		return Result.err(error instanceof Error ? error.message : 'Failed to create bookmark')
	}
}

async function hydrateBookmarkShape(editor: Editor, shapeId: TLShapeId, url: string) {
	let asset
	try {
		asset = await editor.getAssetForExternalContent({ type: 'url', url })
	} catch (error) {
		console.error(error)
		return
	}

	if (editor.isDisposed) return
	if (!asset) return

	// The shape may have been deleted (e.g. via undo) or had its asset replaced
	// before the fetch resolved.
	const shape = editor.getShape<TLBookmarkShape>(shapeId)
	if (!shape) return
	if (shape.props.assetId) return

	editor.run(
		() => {
			if (!editor.getAsset(asset.id)) {
				editor.createAssets([asset])
			}
			editor.updateShapes([
				{
					id: shapeId,
					type: 'bookmark',
					props: { assetId: asset.id },
				},
			])
		},
		{ history: 'ignore' }
	)
}
