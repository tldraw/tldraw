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
	TLFileReplaceExternalContent,
	TLImageAsset,
	TLImageShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	TLTextShapeProps,
	TLUrlExternalAsset,
	TLVideoAsset,
	TLVideoShape,
	Vec,
	VecLike,
	assert,
	createShapeId,
	fetch,
	getHashForBuffer,
	getHashForString,
	maybeSnapToGrid,
	toRichText,
} from '@tldraw/editor'
import { EmbedDefinition } from './defaultEmbedDefinitions'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import { getCroppedImageDataForReplacedImage } from './shapes/shared/crop'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from './shapes/shared/default-shape-constants'
import { TLUiToastsContextType } from './ui/context/toasts'
import { useTranslation } from './ui/hooks/useTranslation/useTranslation'
import { containBoxSize } from './utils/assets/assets'
import { putExcalidrawContent } from './utils/excalidraw/putExcalidrawContent'
import { renderRichTextFromHTML } from './utils/text/richText'
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

	// file-replace -> asset
	editor.registerExternalContentHandler('file-replace', async (externalContent) => {
		return defaultHandleExternalFileReplaceContent(editor, externalContent, options)
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
	options: TLDefaultExternalContentHandlerOpts
) {
	const isSuccess = notifyIfFileNotAllowed(file, options)
	if (!isSuccess) assert(false, 'File checks failed')

	const assetInfo = await getAssetInfo(file, options, assetId)
	const result = await editor.uploadAsset(assetInfo, file)
	assetInfo.props.src = result.src
	if (result.meta) assetInfo.meta = { ...assetInfo.meta, ...result.meta }

	return AssetRecordType.create(assetInfo)
}

/** @public */
export async function defaultHandleExternalFileReplaceContent(
	editor: Editor,
	{ file, shapeId, isImage }: TLFileReplaceExternalContent,
	options: TLDefaultExternalContentHandlerOpts
) {
	const isSuccess = notifyIfFileNotAllowed(file, options)
	if (!isSuccess) assert(false, 'File checks failed')

	const shape = editor.getShape(shapeId)
	if (!shape) assert(false, 'Shape not found')

	const hash = getHashForBuffer(await file.arrayBuffer())
	const assetId = AssetRecordType.createId(hash)
	editor.createTemporaryAssetPreview(assetId, file)
	const assetInfoPartial = await getMediaAssetInfoPartial(
		file,
		assetId,
		isImage /* isImage */,
		!isImage /* isVideo */
	)
	editor.createAssets([assetInfoPartial])

	// And update the shape
	if (shape.type === 'image') {
		const imageShape = shape as TLImageShape
		const currentCrop = imageShape.props.crop

		// Calculate new dimensions that preserve the current visual size of the cropped area
		let newWidth = assetInfoPartial.props.w
		let newHeight = assetInfoPartial.props.h
		let newX = imageShape.x
		let newY = imageShape.y
		let finalCrop = currentCrop

		if (currentCrop) {
			// Use the dedicated function to calculate the new crop and dimensions
			const result = getCroppedImageDataForReplacedImage(
				imageShape,
				assetInfoPartial.props.w,
				assetInfoPartial.props.h
			)

			finalCrop = result.crop
			newWidth = result.w
			newHeight = result.h
			newX = result.x
			newY = result.y
		}

		editor.updateShapes<TLImageShape>([
			{
				id: imageShape.id,
				type: imageShape.type,
				props: {
					assetId: assetId,
					crop: finalCrop,
					w: newWidth,
					h: newHeight,
				},
				x: newX,
				y: newY,
			},
		])
	} else if (shape.type === 'video') {
		editor.updateShapes<TLVideoShape>([
			{
				id: shape.id,
				type: shape.type,
				props: {
					assetId: assetId,
					w: assetInfoPartial.props.w,
					h: assetInfoPartial.props.h,
				},
			},
		])
	}

	const asset = (await editor.getAssetForExternalContent({
		type: 'file',
		file,
		assetId,
	})) as TLAsset

	editor.updateAssets([{ ...asset, id: assetId }])

	return asset
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

	const newPoint = maybeSnapToGrid(
		new Vec(position.x - (width || 450) / 2, position.y - (height || 450) / 2),
		editor
	)
	const shapePartial: TLShapePartial = {
		id,
		type: 'embed',
		x: newPoint.x,
		y: newPoint.y,
		props: {
			w: width,
			h: height,
			url,
		},
	}

	if (editor.canCreateShape(shapePartial)) {
		editor.createShape(shapePartial).select(id)
	}
}

/** @public */
export async function defaultHandleExternalFileContent(
	editor: Editor,
	{ point, files }: { point?: VecLike; files: File[] },
	options: TLDefaultExternalContentHandlerOpts
) {
	const { acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES, toasts, msg } = options
	if (files.length > editor.options.maxFilesAtOnce) {
		toasts.addToast({ title: msg('assets.files.amount-too-many'), severity: 'error' })
		return
	}

	const position =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const pagePoint = new Vec(position.x, position.y)
	const assetPartials: TLAsset[] = []
	const assetsToUpdate: {
		asset: TLAsset
		file: File
	}[] = []
	for (const file of files) {
		const isSuccess = notifyIfFileNotAllowed(file, options)
		if (!isSuccess) continue

		const assetInfo = await getAssetInfo(file, options)
		if (acceptedImageMimeTypes.includes(file.type)) {
			editor.createTemporaryAssetPreview(assetInfo.id, file)
		}
		assetPartials.push(assetInfo)
		assetsToUpdate.push({ asset: assetInfo, file })
	}

	Promise.allSettled(
		assetsToUpdate.map(async (assetAndFile) => {
			try {
				const newAsset = await editor.getAssetForExternalContent({
					type: 'file',
					file: assetAndFile.file,
				})

				if (!newAsset) {
					throw Error('Could not create an asset')
				}

				// Save the new asset under the old asset's id
				editor.updateAssets([{ ...newAsset, id: assetAndFile.asset.id }])
			} catch (error) {
				toasts.addToast({
					title: msg('assets.files.upload-failed'),
					severity: 'error',
				})
				console.error(error)
				editor.deleteAssets([assetAndFile.asset.id])
				return
			}
		})
	)

	createShapesForAssets(editor, assetPartials, pagePoint)
}

/** @public */
export async function defaultHandleExternalTextContent(
	editor: Editor,
	{ point, text, html }: { point?: VecLike; text: string; html?: string }
) {
	const p =
		point ??
		(editor.inputs.shiftKey
			? editor.inputs.currentPagePoint
			: editor.getViewportPageBounds().center)

	const defaultProps = editor.getShapeUtil<TLTextShape>('text').getDefaultProps()

	const cleanedUpPlaintext = cleanupText(text)
	const richTextToPaste = html
		? renderRichTextFromHTML(editor, html)
		: toRichText(cleanedUpPlaintext)

	// todo: discuss
	// If we have one shape with rich text selected, update the shape's text.
	// const onlySelectedShape = editor.getOnlySelectedShape()
	// if (onlySelectedShape && 'richText' in onlySelectedShape.props) {
	// 	editor.updateShapes([
	// 		{
	// 			id: onlySelectedShape.id,
	// 			type: onlySelectedShape.type,
	// 			props: {
	// 				richText: richTextToPaste,
	// 			},
	// 		},
	// 	])

	// 	return
	// }

	// Measure the text with default values
	let w: number
	let h: number
	let autoSize: boolean
	let align = 'middle' as TLTextShapeProps['textAlign']

	const htmlToMeasure = html ?? cleanedUpPlaintext.replace(/\n/g, '<br>')
	const isMultiLine = html
		? richTextToPaste.content.length > 1
		: cleanedUpPlaintext.split('\n').length > 1

	// check whether the text contains the most common characters in RTL languages
	const isRtl = isRightToLeftLanguage(cleanedUpPlaintext)

	if (isMultiLine) {
		align = isMultiLine ? (isRtl ? 'end' : 'start') : 'middle'
	}

	const rawSize = editor.textMeasure.measureHtml(htmlToMeasure, {
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
		const shrunkSize = editor.textMeasure.measureHtml(htmlToMeasure, {
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
		w = Math.max(rawSize.w, 10)
		h = Math.max(rawSize.h, 10)
		autoSize = true
	}

	if (p.y - h / 2 < editor.getViewportPageBounds().minY + 40) {
		p.y = editor.getViewportPageBounds().minY + 40 + h / 2
	}

	const newPoint = maybeSnapToGrid(new Vec(p.x - w / 2, p.y - h / 2), editor)
	const shapeId = createShapeId()

	// Allow this to trigger the max shapes reached alert
	editor.createShapes<TLTextShape>([
		{
			id: shapeId,
			type: 'text',
			x: newPoint.x,
			y: newPoint.y,
			props: {
				richText: richTextToPaste,
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

	if (embedInfo && embedInfo.definition.embedOnPaste !== false) {
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

		// Unlock any locked root shapes on paste
		for (const shape of content.shapes) {
			if (content.rootShapeIds.includes(shape.id)) {
				shape.isLocked = false
			}
		}

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
	isVideoType: boolean,
	maxImageDimension?: number
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
	} as TLImageAsset | TLVideoAsset

	if (maxImageDimension && isFinite(maxImageDimension)) {
		const size = { w: assetInfo.props.w, h: assetInfo.props.h }
		const resizedSize = containBoxSize(size, { w: maxImageDimension, h: maxImageDimension })
		if (size !== resizedSize && MediaHelpers.isStaticImageType(file.type)) {
			assetInfo.props.w = resizedSize.w
			assetInfo.props.h = resizedSize.h
		}
	}

	return assetInfo
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

		editor.store.atomic(() => {
			if (editor.canCreateShapes(partials)) {
				if (assetsToCreate.length) {
					editor.createAssets(assetsToCreate)
				}

				// Create the shapes
				editor.createShapes(partials).select(...partials.map((p) => p.id))

				// Re-position shapes so that the center of the group is at the provided point
				centerSelectionAroundPoint(editor, position)
			}
		})
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
		// Allow this to trigger the max shapes reached alert
		editor.createShape(partial)
		if (!editor.getShape(partial.id)) return
		editor.select(partial.id)
		centerSelectionAroundPoint(editor, position)
	})

	return editor.getShape(partial.id) as TLBookmarkShape
}

/**
 * Checks if a file is allowed to be uploaded. If it is not, it will show a toast explaining why to the user.
 *
 * @param file - The file to check
 * @param options - The options for the external content handler
 * @returns True if the file is allowed, false otherwise
 * @public
 */
export function notifyIfFileNotAllowed(file: File, options: TLDefaultExternalContentHandlerOpts) {
	const {
		acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
		acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
		maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
		toasts,
		msg,
	} = options
	const isImageType = acceptedImageMimeTypes.includes(file.type)
	const isVideoType = acceptedVideoMimeTypes.includes(file.type)

	if (!isImageType && !isVideoType) {
		toasts.addToast({
			title: msg('assets.files.type-not-allowed'),
			severity: 'error',
		})
		return false
	}

	if (file.size > maxAssetSize) {
		const formatBytes = (bytes: number): string => {
			if (bytes === 0) return '0 bytes'

			const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
			const base = 1024
			const unitIndex = Math.floor(Math.log(bytes) / Math.log(base))

			const value = bytes / Math.pow(base, unitIndex)
			const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1)

			return `${formatted} ${units[unitIndex]}`
		}

		toasts.addToast({
			title: msg('assets.files.size-too-big'),
			description: msg('assets.files.maximum-size').replace('{size}', formatBytes(maxAssetSize)),
			severity: 'error',
		})
		return false
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
		return false
	}

	return true
}

/** @public */
export async function getAssetInfo(
	file: File,
	options: TLDefaultExternalContentHandlerOpts,
	assetId?: TLAssetId
) {
	const {
		acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
		acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
		maxImageDimension = DEFAULT_MAX_IMAGE_DIMENSION,
	} = options

	const isImageType = acceptedImageMimeTypes.includes(file.type)
	const isVideoType = acceptedVideoMimeTypes.includes(file.type)
	const hash = getHashForBuffer(await file.arrayBuffer())
	assetId ??= AssetRecordType.createId(hash)
	const assetInfo = await getMediaAssetInfoPartial(
		file,
		assetId,
		isImageType,
		isVideoType,
		maxImageDimension
	)
	return assetInfo
}
