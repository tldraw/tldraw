import {
	AssetRecordType,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLContent,
	TLFileExternalAsset,
	TLImageAsset,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	TLTextShapeProps,
	TLUrlExternalAsset,
	TLVideoAsset,
	Vec,
	VecLike,
	assert,
	createShapeId,
	fetch,
	getHashForBuffer,
	getHashForString,
} from '@tldraw/editor'
import { EmbedDefinition } from './defaultEmbedDefinitions'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from './shapes/shared/default-shape-constants'
import { TLUiToastsContextType } from './ui/context/toasts'
import { useTranslation } from './ui/hooks/useTranslation/useTranslation'
import { containBoxSize } from './utils/assets/assets'
import { putExcalidrawContent } from './utils/excalidraw/putExcalidrawContent'
import { cleanupText, isRightToLeftLanguage } from './utils/text/text'

/**
 * 5000px
 * @public
 */
export const DEFAULT_MAX_IMAGE_DIMENSION = 5000
/**
 * 10mb
 * @public
 */
export const DEFAULT_MAX_ASSET_SIZE = 10 * 1024 * 1024

/** @public */
export interface TLExternalContentProps {
	/**
	 * The maximum dimension (width or height) of an image. Images larger than this will be rescaled
	 * to fit. Defaults to infinity.
	 */
	maxImageDimension?: number
	/**
	 * The maximum size (in bytes) of an asset. Assets larger than this will be rejected. Defaults
	 * to 10mb (10 * 1024 * 1024).
	 */
	maxAssetSize?: number
	/**
	 * The mime types of images that are allowed to be handled. Defaults to
	 * DEFAULT_SUPPORTED_IMAGE_TYPES.
	 */
	acceptedImageMimeTypes?: readonly string[]
	/**
	 * The mime types of videos that are allowed to be handled. Defaults to
	 * DEFAULT_SUPPORT_VIDEO_TYPES.
	 */
	acceptedVideoMimeTypes?: readonly string[]
}

/** @public */
export interface TLDefaultExternalContentHandlerOpts extends TLExternalContentProps {
	toasts: TLUiToastsContextType
	msg: ReturnType<typeof useTranslation>
}

/** @public */
export function registerDefaultExternalContentHandlers(
	editor: Editor,
	options: TLDefaultExternalContentHandlerOpts
) {
	// files -> asset
	editor.registerExternalAssetHandler('file', async (externalAsset) => {
		return defaultHandleExternalFileAsset(editor, externalAsset, options)
	})

	// urls -> bookmark asset
	editor.registerExternalAssetHandler('url', async (externalAsset) => {
		return defaultHandleExternalUrlAsset(editor, externalAsset, options)
	})

	// svg text
	editor.registerExternalContentHandler('svg-text', async (externalContent) => {
		return defaultHandleExternalSvgTextContent(editor, externalContent)
	})

	// embeds
	editor.registerExternalContentHandler<'embed', EmbedDefinition>('embed', (externalContent) => {
		return defaultHandleExternalEmbedContent(editor, externalContent)
	})

	// files
	editor.registerExternalContentHandler('files', async (externalContent) => {
		return defaultHandleExternalFileContent(editor, externalContent, options)
	})

	// text
	editor.registerExternalContentHandler('text', async (externalContent) => {
		return defaultHandleExternalTextContent(editor, externalContent)
	})

	// url
	editor.registerExternalContentHandler('url', async (externalContent) => {
		return defaultHandleExternalUrlContent(editor, externalContent, options)
	})

	// tldraw
	editor.registerExternalContentHandler('tldraw', async (externalContent) => {
		return defaultHandleExternalTldrawContent(editor, externalContent)
	})

	// excalidraw
	editor.registerExternalContentHandler('excalidraw', async (externalContent) => {
		return defaultHandleExternalExcalidrawContent(editor, externalContent)
	})
}

/** @public */
export async function defaultHandleExternalFileAsset(
	editor: Editor,
	{ file, assetId }: TLFileExternalAsset,
	{
		acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
		acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
		maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
		maxImageDimension = DEFAULT_MAX_IMAGE_DIMENSION,
		toasts,
		msg,
	}: TLDefaultExternalContentHandlerOpts
) {
	const isImageType = acceptedImageMimeTypes.includes(file.type)
	const isVideoType = acceptedVideoMimeTypes.includes(file.type)

	if (!isImageType && !isVideoType) {
		toasts.addToast({
			title: msg('assets.files.type-not-allowed'),
			severity: 'error',
		})
	}
	assert(isImageType || isVideoType, `File type not allowed: ${file.type}`)

	if (file.size > maxAssetSize) {
		toasts.addToast({
			title: msg('assets.files.size-too-big'),
			severity: 'error',
		})
	}
	assert(
		file.size <= maxAssetSize,
		`File size too big: ${(file.size / 1024).toFixed()}kb > ${(maxAssetSize / 1024).toFixed()}kb`
	)

	const hash = getHashForBuffer(await file.arrayBuffer())
	assetId = assetId ?? AssetRecordType.createId(hash)
	const assetInfo = await getMediaAssetInfoPartial(file, assetId, isImageType, isVideoType)

	if (isFinite(maxImageDimension)) {
		const size = { w: assetInfo.props.w, h: assetInfo.props.h }
		const resizedSize = containBoxSize(size, { w: maxImageDimension, h: maxImageDimension })
		if (size !== resizedSize && MediaHelpers.isStaticImageType(file.type)) {
			assetInfo.props.w = resizedSize.w
			assetInfo.props.h = resizedSize.h
		}
	}

	const result = await editor.uploadAsset(assetInfo, file)
	assetInfo.props.src = result.src
	if (result.meta) assetInfo.meta = { ...assetInfo.meta, ...result.meta }

	return AssetRecordType.create(assetInfo)
}

/** @public */
export async function defaultHandleExternalUrlAsset(
	editor: Editor,
	{ url }: TLUrlExternalAsset,
	{ toasts, msg }: TLDefaultExternalContentHandlerOpts
): Promise<TLBookmarkAsset> {
	let meta: { image: string; favicon: string; title: string; description: string }

	try {
		const resp = await fetch(url, {
			method: 'GET',
			mode: 'no-cors',
		})
		const html = await resp.text()
		const doc = new DOMParser().parseFromString(html, 'text/html')
		meta = {
			image: doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
			favicon:
				doc.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ??
				doc.head.querySelector('link[rel="icon"]')?.getAttribute('href') ??
				'',
			title: doc.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? url,
			description:
				doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
		}
		if (!meta.image.startsWith('http')) {
			meta.image = new URL(meta.image, url).href
		}
		if (!meta.favicon.startsWith('http')) {
			meta.favicon = new URL(meta.favicon, url).href
		}
	} catch (error) {
		console.error(error)
		toasts.addToast({
			title: msg('assets.url.failed'),
			severity: 'error',
		})
		meta = { image: '', favicon: '', title: '', description: '' }
	}

	// Create the bookmark asset from the meta
	return {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		props: {
			src: url,
			description: meta.description,
			image: meta.image,
			favicon: meta.favicon,
			title: meta.title,
		},
		meta: {},
	} as TLBookmarkAsset
}

/** @public */
export async function defaultHandleExternalSvgTextContent(
	editor: Editor,
	{ point, text }: { point?: VecLike; text: string }
) {
	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const svg = new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('svg')
	if (!svg) {
		throw new Error('No <svg/> element present')
	}

	let width = parseFloat(svg.getAttribute('width') || '0')
	let height = parseFloat(svg.getAttribute('height') || '0')

	if (!(width && height)) {
		document.body.appendChild(svg)
		const box = svg.getBoundingClientRect()
		document.body.removeChild(svg)

		width = box.width
		height = box.height
	}

	const asset = await editor.getAssetForExternalContent({
		type: 'file',
		file: new File([text], 'asset.svg', { type: 'image/svg+xml' }),
	})

	if (!asset) throw Error('Could not create an asset')

	createShapesForAssets(editor, [asset], position)
}

/** @public */
export function defaultHandleExternalEmbedContent<T>(
	editor: Editor,
	{ point, url, embed }: { point?: VecLike; url: string; embed: T }
) {
	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const { width, height } = embed as { width: number; height: number }

	const id = createShapeId()

	const shapePartial: TLShapePartial = {
		id,
		type: 'embed',
		x: position.x - (width || 450) / 2,
		y: position.y - (height || 450) / 2,
		props: {
			w: width,
			h: height,
			url,
		},
	}

	editor.createShapes([shapePartial]).select(id)
}

/** @public */
export async function defaultHandleExternalFileContent(
	editor: Editor,
	{ point, files }: { point?: VecLike; files: File[] },
	{
		maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
		acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
		acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
		toasts,
		msg,
	}: TLDefaultExternalContentHandlerOpts
) {
	if (files.length > editor.options.maxFilesAtOnce) {
		toasts.addToast({ title: msg('assets.files.amount-too-big'), severity: 'error' })
		return
	}

	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const pagePoint = new Vec(position.x, position.y)
	const assetsToUpdate: {
		asset: TLAsset
		file: File
		temporaryAssetPreview?: string
	}[] = []
	for (const file of files) {
		if (file.size > maxAssetSize) {
			toasts.addToast({
				title: msg('assets.files.size-too-big'),
				severity: 'error',
			})

			console.warn(
				`File size too big: ${(file.size / 1024).toFixed()}kb > ${(
					maxAssetSize / 1024
				).toFixed()}kb`
			)
			continue
		}

		// Use mime type instead of file ext, this is because
		// window.navigator.clipboard does not preserve file names
		// of copied files.
		if (!file.type) {
			toasts.addToast({
				title: msg('assets.files.upload-failed'),
				severity: 'error',
			})
			console.error('No mime type')
			continue
		}

		// We can only accept certain extensions (either images or a videos)
		const acceptedTypes = [...acceptedImageMimeTypes, ...acceptedVideoMimeTypes]
		if (!acceptedTypes.includes(file.type)) {
			toasts.addToast({
				title: msg('assets.files.type-not-allowed'),
				severity: 'error',
			})

			console.warn(`${file.name} not loaded - Mime type not allowed ${file.type}.`)
			continue
		}

		const isImageType = acceptedImageMimeTypes.includes(file.type)
		const isVideoType = acceptedVideoMimeTypes.includes(file.type)
		const hash = getHashForBuffer(await file.arrayBuffer())
		const assetId: TLAssetId = AssetRecordType.createId(hash)
		const assetInfo = await getMediaAssetInfoPartial(file, assetId, isImageType, isVideoType)
		let temporaryAssetPreview
		if (isImageType) {
			temporaryAssetPreview = editor.createTemporaryAssetPreview(assetId, file)
		}
		assetsToUpdate.push({ asset: assetInfo, file, temporaryAssetPreview })
	}

	const assets: TLAsset[] = []
	await Promise.allSettled(
		assetsToUpdate.map(async (assetAndFile) => {
			try {
				const newAsset = await editor.getAssetForExternalContent({
					type: 'file',
					file: assetAndFile.file,
				})

				if (!newAsset) {
					throw Error('Could not create an asset')
				}

				const updated = { ...newAsset, id: assetAndFile.asset.id }
				assets.push(updated)
				// Save the new asset under the old asset's id
				editor.updateAssets([updated])
			} catch (error) {
				toasts.addToast({
					title: msg('assets.files.upload-failed'),
					severity: 'error',
				})
				console.error(error)
				return
			}
		})
	)

	createShapesForAssets(editor, assets, pagePoint)
}

/** @public */
export async function defaultHandleExternalTextContent(
	editor: Editor,
	{ point, text }: { point?: VecLike; text: string }
) {
	const p =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const defaultProps = editor.getShapeUtil<TLTextShape>('text').getDefaultProps()

	const textToPaste = cleanupText(text)

	// If we're pasting into a text shape, update the text.
	const onlySelectedShape = editor.getOnlySelectedShape()
	if (onlySelectedShape && 'text' in onlySelectedShape.props) {
		editor.updateShapes([
			{
				id: onlySelectedShape.id,
				type: onlySelectedShape.type,
				props: {
					text: textToPaste,
				},
			},
		])

		return
	}

	// Measure the text with default values
	let w: number
	let h: number
	let autoSize: boolean
	let align = 'middle' as TLTextShapeProps['textAlign']

	const isMultiLine = textToPaste.split('\n').length > 1

	// check whether the text contains the most common characters in RTL languages
	const isRtl = isRightToLeftLanguage(textToPaste)

	if (isMultiLine) {
		align = isMultiLine ? (isRtl ? 'end' : 'start') : 'middle'
	}

	const rawSize = editor.textMeasure.measureText(textToPaste, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[defaultProps.font],
		fontSize: FONT_SIZES[defaultProps.size],
		maxWidth: null,
	})

	const minWidth = Math.min(
		isMultiLine ? editor.getViewportPageBounds().width * 0.9 : 920,
		Math.max(200, editor.getViewportPageBounds().width * 0.9)
	)

	if (rawSize.w > minWidth) {
		const shrunkSize = editor.textMeasure.measureText(textToPaste, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[defaultProps.font],
			fontSize: FONT_SIZES[defaultProps.size],
			maxWidth: minWidth,
		})
		w = shrunkSize.w
		h = shrunkSize.h
		autoSize = false
		align = isRtl ? 'end' : 'start'
	} else {
		// autosize is fine
		w = rawSize.w
		h = rawSize.h
		autoSize = true
	}

	if (p.y - h / 2 < editor.getViewportPageBounds().minY + 40) {
		p.y = editor.getViewportPageBounds().minY + 40 + h / 2
	}

	editor.createShapes<TLTextShape>([
		{
			id: createShapeId(),
			type: 'text',
			x: p.x - w / 2,
			y: p.y - h / 2,
			props: {
				text: textToPaste,
				// if the text has more than one line, align it to the left
				textAlign: align,
				autoSize,
				w,
			},
		},
	])
}

/** @public */
export async function defaultHandleExternalUrlContent(
	editor: Editor,
	{ point, url }: { point?: VecLike; url: string },
	{ toasts, msg }: TLDefaultExternalContentHandlerOpts
) {
	// try to paste as an embed first
	const embedUtil = editor.getShapeUtil('embed') as EmbedShapeUtil | undefined
	const embedInfo = embedUtil?.getEmbedDefinition(url)

	if (embedInfo) {
		return editor.putExternalContent({
			type: 'embed',
			url: embedInfo.url,
			point,
			embed: embedInfo.definition,
		})
	}

	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))
	const shape = createEmptyBookmarkShape(editor, url, position)

	// Use an existing asset if we have one, or else else create a new one
	let asset = editor.getAsset(assetId) as TLAsset
	let shouldAlsoCreateAsset = false
	if (!asset) {
		shouldAlsoCreateAsset = true
		try {
			const bookmarkAsset = await editor.getAssetForExternalContent({ type: 'url', url })
			if (!bookmarkAsset) throw Error('Could not create an asset')
			asset = bookmarkAsset
		} catch {
			toasts.addToast({
				title: msg('assets.url.failed'),
				severity: 'error',
			})
			return
		}
	}

	editor.run(() => {
		if (shouldAlsoCreateAsset) {
			editor.createAssets([asset])
		}

		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: {
					assetId: asset.id,
				},
			},
		])
	})
}

/** @public */
export async function defaultHandleExternalTldrawContent(
	editor: Editor,
	{ point, content }: { point?: VecLike; content: TLContent }
) {
	editor.run(() => {
		const selectionBoundsBefore = editor.getSelectionPageBounds()
		editor.markHistoryStoppingPoint('paste')
		editor.putContentOntoCurrentPage(content, {
			point: point,
			select: true,
		})
		const selectedBoundsAfter = editor.getSelectionPageBounds()
		if (
			selectionBoundsBefore &&
			selectedBoundsAfter &&
			selectionBoundsBefore?.collides(selectedBoundsAfter)
		) {
			// Creates a 'puff' to show content has been pasted
			editor.updateInstanceState({ isChangingStyle: true })
			editor.timers.setTimeout(() => {
				editor.updateInstanceState({ isChangingStyle: false })
			}, 150)
		}
	})
}

/** @public */
export async function defaultHandleExternalExcalidrawContent(
	editor: Editor,
	{ point, content }: { point?: VecLike; content: any }
) {
	editor.run(() => {
		putExcalidrawContent(editor, content, point)
	})
}

/** @public */
export async function getMediaAssetInfoPartial(
	file: File,
	assetId: TLAssetId,
	isImageType: boolean,
	isVideoType: boolean
) {
	let fileType = file.type

	if (file.type === 'video/quicktime') {
		// hack to make .mov videos work
		fileType = 'video/mp4'
	}

	const size = isImageType
		? await MediaHelpers.getImageSize(file)
		: await MediaHelpers.getVideoSize(file)

	const isAnimated = (await MediaHelpers.isAnimated(file)) || isVideoType

	const assetInfo = {
		id: assetId,
		type: isImageType ? 'image' : 'video',
		typeName: 'asset',
		props: {
			name: file.name,
			src: '',
			w: size.w,
			h: size.h,
			fileSize: file.size,
			mimeType: fileType,
			isAnimated,
		},
		meta: {},
	} as TLAsset

	return assetInfo as TLImageAsset | TLVideoAsset
}

/**
 * A helper function for an external content handler. It creates bookmarks,
 * images or video shapes corresponding to the type of assets provided.
 *
 * @param editor - The editor instance
 *
 * @param assets - An array of asset Ids
 *
 * @param position - the position at which to create the shapes
 *
 * @public
 */
export async function createShapesForAssets(
	editor: Editor,
	assets: TLAsset[],
	position: VecLike
): Promise<TLShapeId[]> {
	if (!assets.length) return []

	const currentPoint = Vec.From(position)
	const partials: TLShapePartial[] = []

	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i]
		switch (asset.type) {
			case 'image': {
				partials.push({
					id: createShapeId(),
					type: 'image',
					x: currentPoint.x,
					y: currentPoint.y,
					opacity: 1,
					props: {
						assetId: asset.id,
						w: asset.props.w,
						h: asset.props.h,
					},
				})

				currentPoint.x += asset.props.w
				break
			}
			case 'video': {
				partials.push({
					id: createShapeId(),
					type: 'video',
					x: currentPoint.x,
					y: currentPoint.y,
					opacity: 1,
					props: {
						assetId: asset.id,
						w: asset.props.w,
						h: asset.props.h,
					},
				})

				currentPoint.x += asset.props.w
			}
		}
	}

	editor.run(() => {
		// Create any assets
		const assetsToCreate = assets.filter((asset) => !editor.getAsset(asset.id))
		if (assetsToCreate.length) {
			editor.createAssets(assetsToCreate)
		}

		// Create the shapes
		editor.createShapes(partials).select(...partials.map((p) => p.id))

		// Re-position shapes so that the center of the group is at the provided point
		centerSelectionAroundPoint(editor, position)
	})

	return partials.map((p) => p.id)
}

/**
 * Repositions selected shapes do that the center of the group is
 * at the provided position
 *
 * @param editor - The editor instance
 *
 * @param position - the point to center the shapes around
 *
 * @public
 */
export function centerSelectionAroundPoint(editor: Editor, position: VecLike) {
	// Re-position shapes so that the center of the group is at the provided point
	const viewportPageBounds = editor.getViewportPageBounds()
	let selectionPageBounds = editor.getSelectionPageBounds()

	if (selectionPageBounds) {
		const offset = selectionPageBounds!.center.sub(position)

		editor.updateShapes(
			editor.getSelectedShapes().map((shape) => {
				const localRotation = editor.getShapeParentTransform(shape).decompose().rotation
				const localDelta = Vec.Rot(offset, -localRotation)
				return {
					id: shape.id,
					type: shape.type,
					x: shape.x! - localDelta.x,
					y: shape.y! - localDelta.y,
				}
			})
		)
	}
	selectionPageBounds = editor.getSelectionPageBounds()
	// align selection with the grid if necessary
	if (selectionPageBounds && editor.getInstanceState().isGridMode) {
		const gridSize = editor.getDocumentSettings().gridSize
		const topLeft = new Vec(selectionPageBounds.minX, selectionPageBounds.minY)
		const gridSnappedPoint = topLeft.clone().snapToGrid(gridSize)
		const delta = Vec.Sub(topLeft, gridSnappedPoint)
		editor.updateShapes(
			editor.getSelectedShapes().map((shape) => {
				const newPoint = { x: shape.x! - delta.x, y: shape.y! - delta.y }
				return {
					id: shape.id,
					type: shape.type,
					x: newPoint.x,
					y: newPoint.y,
				}
			})
		)
	}
	// Zoom out to fit the shapes, if necessary
	selectionPageBounds = editor.getSelectionPageBounds()
	if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
		editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
	}
}

/** @public */
export function createEmptyBookmarkShape(
	editor: Editor,
	url: string,
	position: VecLike
): TLBookmarkShape {
	const partial: TLShapePartial = {
		id: createShapeId(),
		type: 'bookmark',
		x: position.x - 150,
		y: position.y - 160,
		opacity: 1,
		props: {
			assetId: null,
			url,
		},
	}

	editor.run(() => {
		editor.createShapes([partial]).select(partial.id)
		centerSelectionAroundPoint(editor, position)
	})

	return editor.getShape(partial.id) as TLBookmarkShape
}
