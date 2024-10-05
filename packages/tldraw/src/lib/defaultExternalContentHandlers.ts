import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLBookmarkShape,
	TLEmbedShape,
	TLImageAsset,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	TLTextShapeProps,
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
import { cleanupText, isRightToLeftLanguage } from './utils/text/text'

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
export function registerDefaultExternalContentHandlers(
	editor: Editor,
	{
		maxImageDimension,
		maxAssetSize,
		acceptedImageMimeTypes,
		acceptedVideoMimeTypes,
	}: Required<TLExternalContentProps>,
	{ toasts, msg }: { toasts: TLUiToastsContextType; msg: ReturnType<typeof useTranslation> }
) {
	// files -> asset
	editor.registerExternalAssetHandler('file', async ({ file, assetId }) => {
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

		assetInfo.props.src = await editor.uploadAsset(assetInfo, file)

		return AssetRecordType.create(assetInfo)
	})

	// urls -> bookmark asset
	editor.registerExternalAssetHandler('url', async ({ url }) => {
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
		}
	})

	// svg text
	editor.registerExternalContentHandler('svg-text', async ({ point, text }) => {
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
	})

	// embeds
	editor.registerExternalContentHandler<'embed', EmbedDefinition>(
		'embed',
		({ point, url, embed }) => {
			const position =
				point ??
				(editor.inputs.shiftKey
					? editor.inputs.currentPagePoint
					: editor.getViewportPageBounds().center)

			const { width, height } = embed

			const id = createShapeId()

			const shapePartial: TLShapePartial<TLEmbedShape> = {
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
	)

	// files
	editor.registerExternalContentHandler('files', async ({ point, files }) => {
		if (files.length > editor.options.maxFilesAtOnce) {
			throw Error('Too many files')
		}

		const position =
			point ??
			(editor.inputs.shiftKey
				? editor.inputs.currentPagePoint
				: editor.getViewportPageBounds().center)

		const pagePoint = new Vec(position.x, position.y)
		const assets: TLAsset[] = []
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
			if (!acceptedImageMimeTypes.concat(acceptedVideoMimeTypes).includes(file.type)) {
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
			assets.push(assetInfo)
			assetsToUpdate.push({ asset: assetInfo, file, temporaryAssetPreview })
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
					return
				}
			})
		)

		createShapesForAssets(editor, assets, pagePoint)
	})

	// text
	editor.registerExternalContentHandler('text', async ({ point, text }) => {
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
	})

	// url
	editor.registerExternalContentHandler('url', async ({ point, url }) => {
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
			} catch (e) {
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

	// Zoom out to fit the shapes, if necessary
	selectionPageBounds = editor.getSelectionPageBounds()
	if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
		editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
	}
}

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
