import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLEmbedShape,
	TLShapePartial,
	TLTextShape,
	TLTextShapeProps,
	Vec2d,
	VecLike,
	compact,
	createShapeId,
	getHashForString,
	useEditor,
} from '@tldraw/editor'
import { useEffect } from 'react'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from './shapes/shared/default-shape-constants'
import {
	ACCEPTED_IMG_TYPE,
	ACCEPTED_VID_TYPE,
	containBoxSize,
	getFileMetaData,
	getResizedImageDataUrl,
	isImage,
} from './utils/assets'
import { getEmbedInfo } from './utils/embeds'
import { cleanupText, isRightToLeftLanguage, truncateStringWithEllipsis } from './utils/text'

/** @internal */
export const MAX_ASSET_WIDTH = 1000
/** @internal */
export const MAX_ASSET_HEIGHT = 1000

export function useRegisterExternalContentHandlers() {
	const editor = useEditor()
	useEffect(() => {
		// files -> asset
		editor.registerExternalAssetHandler('file', async ({ file }) => {
			return await new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onerror = () => reject(reader.error)
				reader.onload = async () => {
					let dataUrl = reader.result as string

					const isImageType = isImage(file.type)
					const sizeFn = isImageType
						? MediaHelpers.getImageSizeFromSrc
						: MediaHelpers.getVideoSizeFromSrc

					// Hack to make .mov videos work via dataURL.
					if (file.type === 'video/quicktime' && dataUrl.includes('video/quicktime')) {
						dataUrl = dataUrl.replace('video/quicktime', 'video/mp4')
					}

					const originalSize = await sizeFn(dataUrl)
					const size = containBoxSize(originalSize, { w: MAX_ASSET_WIDTH, h: MAX_ASSET_HEIGHT })

					if (size !== originalSize && (file.type === 'image/jpeg' || file.type === 'image/png')) {
						// If we created a new size and the type is an image, rescale the image
						dataUrl = await getResizedImageDataUrl(dataUrl, size.w, size.h)
					}

					const assetId: TLAssetId = AssetRecordType.createId(getHashForString(dataUrl))

					const metadata = await getFileMetaData(file)

					const asset: Extract<TLAsset, { type: 'image' | 'video' }> = {
						id: assetId,
						type: isImageType ? 'image' : 'video',
						typeName: 'asset',
						props: {
							name: file.name,
							src: dataUrl,
							w: size.w,
							h: size.h,
							mimeType: file.type,
							isAnimated: metadata.isAnimated,
						},
						meta: {},
					}

					resolve(asset)
				}

				reader.readAsDataURL(file)
			})
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
						doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
						'',
				}
			} catch (error) {
				console.error(error)
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
				(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

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
				(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

			const { width, height } = embed

			const shapePartial: TLShapePartial<TLEmbedShape> = {
				id: createShapeId(),
				type: 'embed',
				x: position.x - (width || 450) / 2,
				y: position.y - (height || 450) / 2,
				props: {
					w: width,
					h: height,
					url,
				},
			}

			editor.createShapes([shapePartial], true)
		})

		// files
		editor.registerExternalContentHandler('files', async ({ point, files }) => {
			const position =
				point ??
				(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

			const pagePoint = new Vec2d(position.x, position.y)

			const assets: TLAsset[] = []

			await Promise.all(
				files.map(async (file, i) => {
					// Use mime type instead of file ext, this is because
					// window.navigator.clipboard does not preserve file names
					// of copied files.
					if (!file.type) throw new Error('No mime type')

					// We can only accept certain extensions (either images or a videos)
					if (!ACCEPTED_IMG_TYPE.concat(ACCEPTED_VID_TYPE).includes(file.type)) {
						console.warn(`${file.name} not loaded - Extension not allowed.`)
						return null
					}

					try {
						const asset = await editor.getAssetForExternalContent({ type: 'file', file })

						if (!asset) throw Error('Could not create an asset')

						assets[i] = asset
					} catch (error) {
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
				(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

			const defaultProps = editor.getShapeUtil<TLTextShape>('text').getDefaultProps()

			const textToPaste = cleanupText(text)

			// Measure the text with default values
			let w: number
			let h: number
			let autoSize: boolean
			let align = 'middle' as TLTextShapeProps['align']

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
				width: 'fit-content',
			})

			const minWidth = Math.min(
				isMultiLine ? editor.viewportPageBounds.width * 0.9 : 920,
				Math.max(200, editor.viewportPageBounds.width * 0.9)
			)

			if (rawSize.w > minWidth) {
				const shrunkSize = editor.textMeasure.measureText(textToPaste, {
					...TEXT_PROPS,
					fontFamily: FONT_FAMILIES[defaultProps.font],
					fontSize: FONT_SIZES[defaultProps.size],
					width: minWidth + 'px',
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

			if (p.y - h / 2 < editor.viewportPageBounds.minY + 40) {
				p.y = editor.viewportPageBounds.minY + 40 + h / 2
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
						align,
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
				(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

			const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

			// Use an existing asset if we have one, or else else create a new one
			let asset = editor.getAsset(assetId) as TLAsset
			let shouldAlsoCreateAsset = false
			if (!asset) {
				shouldAlsoCreateAsset = true
				const bookmarkAsset = await editor.getAssetForExternalContent({ type: 'url', url })
				if (!bookmarkAsset) throw Error('Could not create an asset')
				asset = bookmarkAsset
			}

			editor.batch(() => {
				if (shouldAlsoCreateAsset) {
					editor.createAssets([asset])
				}

				createShapesForAssets(editor, [asset], position)
			})
		})
	}, [editor])
}

export async function createShapesForAssets(editor: Editor, assets: TLAsset[], position: VecLike) {
	if (!assets.length) return

	const currentPoint = Vec2d.From(position)
	const paritals: TLShapePartial[] = []

	for (const asset of assets) {
		switch (asset.type) {
			case 'bookmark': {
				paritals.push({
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
				paritals.push({
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
				paritals.push({
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
		editor.createShapes(paritals, true)

		// Re-position shapes so that the center of the group is at the provided point
		const { viewportPageBounds } = editor
		let { selectionPageBounds } = editor

		if (selectionPageBounds) {
			const offset = selectionPageBounds!.center.sub(position)

			editor.updateShapes(
				paritals.map((partial) => {
					return {
						id: partial.id,
						type: partial.type,
						x: partial.x! - offset.x,
						y: partial.y! - offset.y,
					}
				})
			)
		}

		// Zoom out to fit the shapes, if necessary
		selectionPageBounds = editor.selectionPageBounds
		if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
			editor.zoomToSelection()
		}
	})
}
