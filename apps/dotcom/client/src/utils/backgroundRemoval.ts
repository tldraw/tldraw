import { fetch, getHashForBuffer } from '@tldraw/utils'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAssetId,
	TLImageAsset,
	TLImageShape,
} from 'tldraw'
import { USER_CONTENT_URL } from './config'

/** Shape meta: the asset before background removal. */
export const BG_ORIGINAL_ASSET_ID = 'bgOriginalAssetId'
/** Shape meta: the asset after background removal. */
export const BG_REMOVED_ASSET_ID = 'bgRemovedAssetId'
/** Asset meta: whether a scan found a non-opaque pixel. */
export const HAS_TRANSPARENT_PIXELS = 'hasTransparentPixels'

const OPAQUE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])

export function readAssetId(value: unknown): TLAssetId | null {
	return typeof value === 'string' && AssetRecordType.isId(value) ? value : null
}

export function readBackgroundRemovalPair(meta: { [key: string]: unknown }): {
	originalAssetId: TLAssetId | null
	removedAssetId: TLAssetId | null
} {
	return {
		originalAssetId: readAssetId(meta[BG_ORIGINAL_ASSET_ID]),
		removedAssetId: readAssetId(meta[BG_REMOVED_ASSET_ID]),
	}
}

export function readHasTransparentPixels(meta: { [key: string]: unknown }): boolean | null {
	const value = meta[HAS_TRANSPARENT_PIXELS]
	return typeof value === 'boolean' ? value : null
}

export function isOpaqueImageMimeType(mimeType: string | null): boolean {
	return !!mimeType && OPAQUE_MIME_TYPES.has(mimeType)
}

/**
 * Object name for an asset stored on this app's user-content host, or null when background
 * removal can't run (a different host, a data url, or a path we wouldn't want to fetch).
 */
export function userContentObjectName(
	src: string | null | undefined,
	userContentUrl = USER_CONTENT_URL
): string | null {
	if (!src) return null
	let assetUrl: URL
	let baseUrl: URL
	try {
		assetUrl = new URL(src)
		baseUrl = new URL(userContentUrl)
	} catch {
		return null
	}
	if (assetUrl.origin !== baseUrl.origin) return null
	const name = assetUrl.pathname.split('/').filter(Boolean).pop()
	if (!name) return null
	let decoded: string
	try {
		decoded = decodeURIComponent(name)
	} catch {
		return null
	}
	if (!decoded || decoded.includes('/') || decoded.includes('..')) return null
	return decoded
}

export function removeBackgroundRequestPath(objectName: string): string {
	return `/api/app/uploads/${encodeURIComponent(objectName)}/remove-background`
}

/** True when any sampled pixel is not fully opaque. `data` is RGBA. */
export function pixelsHaveTransparency(data: Uint8ClampedArray): boolean {
	// Step four pixels at a time. A cutout's empty background is large enough to hit;
	// a photo's fully opaque pixels are not.
	for (let i = 3; i < data.length; i += 16) {
		if (data[i]! < 250) return true
	}
	return false
}

export function shouldOfferBackgroundRemoval(opts: {
	objectName: string | null
	isAnimated: boolean
	isVector: boolean
	hasTransparentPixels: boolean | null
	hasPair: boolean
}): boolean {
	if (!opts.objectName || opts.isAnimated || opts.isVector) return false
	if (opts.hasPair) return true
	return opts.hasTransparentPixels === false
}

/**
 * Meta to write when the shape's asset changed to something outside the removal pair.
 * Null when the pair should stay (a toggle, or the first swap onto the cutout).
 */
export function staleBackgroundRemovalMeta(
	prevAssetId: string | null,
	nextAssetId: string | null,
	meta: { [key: string]: unknown }
): { [BG_ORIGINAL_ASSET_ID]: null; [BG_REMOVED_ASSET_ID]: null } | null {
	if (prevAssetId === nextAssetId) return null
	const { originalAssetId, removedAssetId } = readBackgroundRemovalPair(meta)
	if (!originalAssetId && !removedAssetId) return null
	if (nextAssetId && (nextAssetId === originalAssetId || nextAssetId === removedAssetId)) {
		return null
	}
	return { [BG_ORIGINAL_ASSET_ID]: null, [BG_REMOVED_ASSET_ID]: null }
}

export function imageCanBeScannedForTransparency(asset: TLImageAsset): boolean {
	if (asset.props.isAnimated || MediaHelpers.isAnimatedImageType(asset.props.mimeType)) return false
	if (MediaHelpers.isVectorImageType(asset.props.mimeType)) return false
	if (isOpaqueImageMimeType(asset.props.mimeType)) return false
	return readHasTransparentPixels(asset.meta) === null
}

export async function imageBlobHasTransparentPixels(blob: Blob): Promise<boolean> {
	const bitmap = await createImageBitmap(blob)
	try {
		const maxEdge = 128
		const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
		const width = Math.max(1, Math.round(bitmap.width * scale))
		const height = Math.max(1, Math.round(bitmap.height * scale))
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const context = canvas.getContext('2d', { willReadFrequently: true })
		if (!context) return false
		context.drawImage(bitmap, 0, 0, width, height)
		return pixelsHaveTransparency(context.getImageData(0, 0, width, height).data)
	} finally {
		bitmap.close()
	}
}

function pngFileName(name: string): string {
	const trimmed = name.trim() || 'image'
	return `${trimmed.replace(/\.[^.]+$/, '')}.png`
}

/**
 * Toggle between the original image and its cutout. The first click asks the sync worker
 * to run Cloudflare's foreground segmentation and stores the PNG as a new asset.
 */
export async function toggleImageBackground(
	editor: Editor,
	shapeId: TLImageShape['id']
): Promise<boolean> {
	const shape = editor.getShape(shapeId)
	if (!shape || shape.type !== 'image' || editor.getIsReadonly()) return false
	const image = shape as TLImageShape
	if (!image.props.assetId) return false

	const { originalAssetId, removedAssetId } = readBackgroundRemovalPair(image.meta)
	if (originalAssetId && removedAssetId) {
		const showingRemoved = image.props.assetId === removedAssetId
		const nextAssetId = showingRemoved ? originalAssetId : removedAssetId
		if (editor.getAsset(nextAssetId)) {
			editor.markHistoryStoppingPoint('remove background')
			editor.updateShape({
				id: image.id,
				type: 'image',
				props: { assetId: nextAssetId },
			})
			return true
		}
		// The cutout is on screen and the original asset is gone, so there is nothing to restore.
		if (showingRemoved) throw new Error('Background removal asset is missing')
	}

	const sourceAssetId = originalAssetId ?? image.props.assetId
	const source = editor.getAsset(sourceAssetId)
	if (!source || source.type !== 'image') throw new Error('Image asset is missing')
	const objectName = userContentObjectName(source.props.src)
	if (!objectName) throw new Error('Image is not stored on tldraw')

	const response = await fetch(removeBackgroundRequestPath(objectName))
	if (!response.ok) throw new Error(`Background removal failed: ${response.status}`)
	const blob = await response.blob()
	const type = blob.type || response.headers.get('content-type') || ''
	if (!type.startsWith('image/')) throw new Error('Background removal returned a non-image')

	const file = new File([blob], pngFileName(source.props.name), { type: 'image/png' })
	const cutoutAssetId = AssetRecordType.createId(getHashForBuffer(await file.arrayBuffer()))

	const latest = editor.getShape(shapeId)
	if (!latest || latest.type !== 'image' || latest.props.assetId !== image.props.assetId) {
		return false
	}

	if (!editor.getAsset(cutoutAssetId)) {
		const uploaded = await editor.getAssetForExternalContent({
			type: 'file',
			file,
			assetId: cutoutAssetId,
		})
		if (!uploaded || uploaded.type !== 'image') throw new Error('Failed to store the cutout')
		const stillCurrent = editor.getShape(shapeId)
		if (
			!stillCurrent ||
			stillCurrent.type !== 'image' ||
			stillCurrent.props.assetId !== image.props.assetId
		) {
			return false
		}
		editor.createAssets([
			{
				...uploaded,
				id: cutoutAssetId,
				meta: { ...uploaded.meta, [HAS_TRANSPARENT_PIXELS]: true },
			},
		])
	}

	editor.markHistoryStoppingPoint('remove background')
	editor.updateShape({
		id: shapeId,
		type: 'image',
		props: { assetId: cutoutAssetId },
		meta: {
			[BG_ORIGINAL_ASSET_ID]: sourceAssetId,
			[BG_REMOVED_ASSET_ID]: cutoutAssetId,
		},
	})
	return true
}
