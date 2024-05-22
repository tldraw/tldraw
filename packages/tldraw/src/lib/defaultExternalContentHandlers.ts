import {
	AssetRecordType,
	Editor,
	FileHelpers,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLBookmarkShape,
	TLEmbedShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	TLTextShapeProps,
	Vec,
	VecLike,
	assert,
	compact,
	createShapeId,
	getHashForBuffer,
	getHashForString,
} from '@tldraw/editor'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from './shapes/shared/default-shape-constants'
import { TLUiToastsContextType } from './ui/context/toasts'
import { useTranslation } from './ui/hooks/useTranslation/useTranslation'
import { containBoxSize, downsizeImage } from './utils/assets/assets'
import { getEmbedInfo } from './utils/embeds/embeds'
import { cleanupText, isRightToLeftLanguage, truncateStringWithEllipsis } from './utils/text/text'

/** @public */
export interface TLExternalContentProps {
	// The maximum dimension (width or height) of an image. Images larger than this will be rescaled to fit. Defaults to infinity.
	maxImageDimension: number
	// The maximum size (in bytes) of an asset. Assets larger than this will be rejected. Defaults to 10mb (10 * 1024 * 1024).
	maxAssetSize: number
	// The mime types of images that are allowed to be handled. Defaults to DEFAULT_SUPPORTED_IMAGE_TYPES.
	acceptedImageMimeTypes: readonly string[]
	// The mime types of videos that are allowed to be handled. Defaults to DEFAULT_SUPPORT_VIDEO_TYPES.
	acceptedVideoMimeTypes: readonly string[]
}

export function registerDefaultExternalContentHandlers(
	editor: Editor,
	{
		maxImageDimension,
		maxAssetSize,
		acceptedImageMimeTypes,
		acceptedVideoMimeTypes,
	}: TLExternalContentProps,
	{ toasts, msg }: { toasts: TLUiToastsContextType; msg: ReturnType<typeof useTranslation> }
) {
	// files -> asset
	editor.registerExternalAssetHandler('file', async ({ file: _file }) => {
		const name = _file.name
		let file: Blob = _file
		const isImageType = acceptedImageMimeTypes.includes(file.type)
		const isVideoType = acceptedVideoMimeTypes.includes(file.type)

		assert(isImageType || isVideoType, `File type not allowed: ${file.type}`)
		assert(
			file.size <= maxAssetSize,
			`File size too big: ${(file.size / 1024).toFixed()}kb > ${(maxAssetSize / 1024).toFixed()}kb`
		)

		if (file.type === 'video/quicktime') {
			// hack to make .mov videos work
			file = new Blob([file], { type: 'video/mp4' })
		}

		let size = isImageType
			? await MediaHelpers.getImageSize(file)
			: await MediaHelpers.getVideoSize(file)

		const isAnimated = (await MediaHelpers.isAnimated(file)) || isVideoType

		const hash = await getHashForBuffer(await file.arrayBuffer())

		if (isFinite(maxImageDimension)) {
			const resizedSize = containBoxSize(size, { w: maxImageDimension, h: maxImageDimension })
			if (size !== resizedSize && MediaHelpers.isStaticImageType(file.type)) {
				size = resizedSize
			}
		}

		// Always rescale the image
		if (!isAnimated && MediaHelpers.isStaticImageType(file.type)) {
			file = await downsizeImage(file, size.w, size.h, {
				type: file.type,
				quality: 0.92,
			})
		}

		const assetId: TLAssetId = AssetRecordType.createId(hash)

		const asset = AssetRecordType.create({
			id: assetId,
			type: isImageType ? 'image' : 'video',
			typeName: 'asset',
			props: {
				name,
				src: await FileHelpers.blobToDataUrl(file),
				w: size.w,
				h: size.h,
				mimeType: file.type,
				isAnimated,
			},
		})

		return asset
	})

	// urls -> bookmark asset
	editor.registerExternalAssetHandler('url', async ({ url }) => {
		let meta: { image: string; title: string; description: string }

		try {
			const resp = await fetch(url, { method: 'GET', mode: 'no-cors' })
			const html = await resp.text()
			const doc = new DOMParser().parseFromString(html, 'text/html')
			meta = {
				image: doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
				title:
					doc.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
					truncateStringWithEllipsis(url, 32),
				description:
					doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
			}
		} catch (error) {
			console.error(error)
			toasts.addToast({
				title: msg('assets.url.failed'),
				severity: 'error',
			})
			meta = { image: '', title: truncateStringWithEllipsis(url, 32), description: '' }
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
	editor.registerExternalContentHandler('embed', ({ point, url, embed }) => {
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
	})

	// files
	editor.registerExternalContentHandler('files', async ({ point, files }) => {
		const position =
			point ??
			(editor.inputs.shiftKey
				? editor.inputs.currentPagePoint
				: editor.getViewportPageBounds().center)

		const pagePoint = new Vec(position.x, position.y)

		const assets: TLAsset[] = []

		await Promise.all(
			files.map(async (file, i) => {
				if (file.size > maxAssetSize) {
					console.warn(
						`File size too big: ${(file.size / 1024).toFixed()}kb > ${(
							maxAssetSize / 1024
						).toFixed()}kb`
					)
					return null
				}

				// Use mime type instead of file ext, this is because
				// window.navigator.clipboard does not preserve file names
				// of copied files.
				if (!file.type) {
					throw new Error('No mime type')
				}

				// We can only accept certain extensions (either images or a videos)
				if (!acceptedImageMimeTypes.concat(acceptedVideoMimeTypes).includes(file.type)) {
					console.warn(`${file.name} not loaded - Extension not allowed.`)
					return null
				}

				try {
					const asset = await editor.getAssetForExternalContent({ type: 'file', file })

					if (!asset) {
						throw Error('Could not create an asset')
					}

					assets[i] = asset
				} catch (error) {
					toasts.addToast({
						title: msg('assets.files.upload-failed'),
						severity: 'error',
					})
					console.error(error)
					return null
				}
			})
		)

		createShapesForAssets(editor, compact(assets), pagePoint)
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
		const embedInfo = getEmbedInfo(url)

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

		editor.batch(() => {
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

export async function createShapesForAssets(
	editor: Editor,
	assets: TLAsset[],
	position: VecLike
): Promise<TLShapeId[]> {
	if (!assets.length) return []

	const currentPoint = Vec.From(position)
	const partials: TLShapePartial[] = []

	for (const asset of assets) {
		switch (asset.type) {
			case 'bookmark': {
				partials.push({
					id: createShapeId(),
					type: 'bookmark',
					x: currentPoint.x - 150,
					y: currentPoint.y - 160,
					opacity: 1,
					props: {
						assetId: asset.id,
						url: asset.props.src,
					},
				})

				currentPoint.x += 300
				break
			}
			case 'image': {
				partials.push({
					id: createShapeId(),
					type: 'image',
					x: currentPoint.x - asset.props.w / 2,
					y: currentPoint.y - asset.props.h / 2,
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
					x: currentPoint.x - asset.props.w / 2,
					y: currentPoint.y - asset.props.h / 2,
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

	editor.batch(() => {
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

function centerSelectionAroundPoint(editor: Editor, position: VecLike) {
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
		editor.zoomToSelection()
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

	editor.batch(() => {
		editor.createShapes([partial]).select(partial.id)
		centerSelectionAroundPoint(editor, position)
	})

	return editor.getShape(partial.id) as TLBookmarkShape
}
