import { Vec2d, VecLike } from '@tldraw/primitives'
import {
	AssetRecordType,
	EmbedDefinition,
	TLAsset,
	TLAssetId,
	TLShapePartial,
	createShapeId,
} from '@tldraw/tlschema'
import { compact, getHashForString } from '@tldraw/utils'
import {
	FONT_FAMILIES,
	FONT_SIZES,
	MAX_ASSET_HEIGHT,
	MAX_ASSET_WIDTH,
	TEXT_PROPS,
} from '../../constants'
import {
	ACCEPTED_IMG_TYPE,
	ACCEPTED_VID_TYPE,
	containBoxSize,
	getFileMetaData,
	getImageSizeFromSrc,
	getResizedImageDataUrl,
	getVideoSizeFromSrc,
	isImage,
} from '../../utils/assets'
import { truncateStringWithEllipsis } from '../../utils/dom'
import { getEmbedInfo } from '../../utils/embeds'
import { Editor } from '../Editor'
import { INDENT } from '../shapeutils/TextShapeUtil/TextHelpers'
import { TextShapeUtil } from '../shapeutils/TextShapeUtil/TextShapeUtil'

/** @public */
export type TLExternalContent =
	| {
			type: 'text'
			point?: VecLike
			text: string
	  }
	| {
			type: 'files'
			files: File[]
			point?: VecLike
			ignoreParent: boolean
	  }
	| {
			type: 'url'
			url: string
			point?: VecLike
	  }
	| {
			type: 'svg-text'
			text: string
			point?: VecLike
	  }
	| {
			type: 'embed'
			url: string
			point?: VecLike
			embed: EmbedDefinition
	  }

/** @public */
export class ExternalContentManager {
	async handleContent(editor: Editor, info: TLExternalContent) {
		switch (info.type) {
			case 'text': {
				return await this.handleText(editor, info)
			}
			case 'files': {
				return await this.handleFiles(editor, info)
			}
			case 'embed': {
				return await this.handleEmbed(editor, info)
			}
			case 'svg-text': {
				return await this.handleSvgText(editor, info)
			}
			case 'url': {
				return await this.handleUrl(editor, info)
			}
		}
	}

	/**
	 * Handle svg text from an external source. Feeling lucky? Overwrite this at runtime to change the way this type of external content is handled.
	 *
	 * @example
	 * ```ts
	 * editor.externalContentManager.handleSvgText = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance.
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	async handleSvgText(
		editor: Editor,
		{ point, text }: Extract<TLExternalContent, { type: 'svg-text' }>
	) {
		const position =
			point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

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

		const asset = await this.createAssetFromFile(
			editor,
			new File([text], 'asset.svg', { type: 'image/svg+xml' })
		)

		this.createShapesForAssets(editor, [asset], position)

		// 	editor.batch(() => {
		// 		asset.props.w = width
		// 		asset.props.h = height
		// 		editor.createAssets([asset])

		// 		editor.createShapes(
		// 			[
		// 				{
		// 					id: createShapeId(),
		// 					type: 'image',
		// 					x: position.x - width / 2,
		// 					y: position.y - height / 2,
		// 					opacity: 1,
		// 					props: {
		// 						assetId: asset.id,
		// 						w: width,
		// 						h: height,
		// 					},
		// 				},
		// 			],
		// 			true
		// 		)
		// 	})
	}

	/**
	 * Handle embed info from an external source. Feeling lucky? Overwrite this at runtime to change the way this type of external content is handled.
	 *
	 * @example
	 * ```ts
	 * editor.externalContentManager.handleEmbed = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	async handleEmbed(
		editor: Editor,
		{ point, url, embed }: Extract<TLExternalContent, { type: 'embed' }>
	) {
		const position =
			point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

		const { width, height, doesResize } = embed

		editor.createShapes(
			[
				{
					id: createShapeId(),
					type: 'embed',
					x: position.x - (width || 450) / 2,
					y: position.y - (height || 450) / 2,
					props: {
						w: width,
						h: height,
						doesResize: doesResize,
						url,
					},
				},
			],
			true
		)
	}

	/**
	 * Handle files from an external source. Feeling lucky? Overwrite this at runtime to change the way this type of external content is handled.
	 *
	 * @example
	 * ```ts
	 * editor.externalContentManager.handleFiles = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	async handleFiles(
		editor: Editor,
		{ point, files }: Extract<TLExternalContent, { type: 'files' }>
	) {
		const position =
			point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

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
					const asset = await this.createAssetFromFile(editor, file)

					if (!asset) throw Error('Could not create an asset')

					assets[i] = asset
				} catch (error) {
					console.error(error)
					return null
				}
			})
		)

		this.createShapesForAssets(editor, compact(assets), pagePoint)
	}

	/**
	 * Handle plain text from an external source. Feeling lucky? Overwrite this at runtime to change the way this type of external content is handled.
	 *
	 * @example
	 * ```ts
	 * editor.externalContentManager.handleText = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	async handleText(editor: Editor, { point, text }: Extract<TLExternalContent, { type: 'text' }>) {
		const p =
			point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

		const defaultProps = editor.getShapeUtil(TextShapeUtil).defaultProps()

		const textToPaste = stripTrailingWhitespace(
			stripCommonMinimumIndentation(replaceTabsWithSpaces(text))
		)

		// Measure the text with default values
		let w: number
		let h: number
		let autoSize: boolean
		let align = 'middle'

		const isMultiLine = textToPaste.split('\n').length > 1

		// check whether the text contains the most common characters in RTL languages
		const isRtl = rtlRegex.test(textToPaste)

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

		editor.mark('paste')
		editor.createShapes([
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
	}

	/**
	 * Handle urls from an external source. Feeling lucky? Overwrite this at runtime to change the way this type of external content is handled.
	 *
	 * @example
	 * ```ts
	 * editor.externalContentManager.handleUrl = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	handleUrl = async (
		editor: Editor,
		{ point, url }: Extract<TLExternalContent, { type: 'url' }>
	) => {
		// try to paste as an embed first
		const embedInfo = getEmbedInfo(url)

		if (embedInfo) {
			return this.handleEmbed(editor, {
				type: 'embed',
				url: embedInfo.url,
				point,
				embed: embedInfo.definition,
			})
		}

		const position =
			point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

		const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

		// Use an existing asset if we have one, or else else create a new one
		let asset = editor.getAssetById(assetId) as TLAsset
		let shouldAlsoCreateAsset = false
		if (!asset) {
			shouldAlsoCreateAsset = true
			asset = await this.createAssetFromUrl(editor, url)
		}

		editor.batch(() => {
			if (shouldAlsoCreateAsset) {
				editor.createAssets([asset])
			}

			this.createShapesForAssets(editor, [asset], position)
		})
	}

	async createShapesForAssets(editor: Editor, assets: TLAsset[], position: VecLike) {
		// const shapePartial: TLShapePartial<TLImageShape | TLVideoShape> = {
		// 	id: createShapeId(),
		// 	type: asset.type,
		// 	x: pagePoint.x + i,
		// 	y: pagePoint.y,
		// 	props: {
		// 		w: asset.props!.w,
		// 		h: asset.props!.h,
		// 	},
		// }

		// return shapePartial

		// // Filter any nullish values and sort the resulting models by x, so that the
		// // left-most model is created first (and placed lowest in the z-order).
		// const results = compact(shapePartials).sort((a, b) => a.x! - b.x!)

		// if (results.length === 0) return

		// // Adjust the placement of the models.
		// for (let i = 0; i < results.length; i++) {
		// 	const model = results[i]
		// 	if (i === 0) {
		// 		// The first shape is placed so that its center is at the dropping point
		// 		model.x! -= model.props!.w! / 2
		// 		model.y! -= model.props!.h! / 2
		// 	} else {
		// 		// Later models are placed to the right of the first shape
		// 		const prevModel = results[i - 1]
		// 		model.x = prevModel.x! + prevModel.props!.w!
		// 		model.y = prevModel.y!
		// 	}
		// }

		// const shapeUpdates = await Promise.all(
		// 	files.map(async (file, i) => {
		// 		const shape = results[i]
		// 		if (!shape) return

		// 		const asset = newAssetsForFiles.get(file)
		// 		if (!asset) return

		// 		// Does the asset collection already have a model with this id
		// 		let existing: TLAsset | undefined = editor.getAssetById(asset.id)

		// 		if (existing) {
		// 			newAssetsForFiles.delete(file)

		// 			if (shape.props) {
		// 				shape.props.assetId = existing.id
		// 			}

		// 			return shape
		// 		}

		// 		existing = editor.getAssetBySrc(asset.props!.src!)

		// 		if (existing) {
		// 			if (shape.props) {
		// 				shape.props.assetId = existing.id
		// 			}

		// 			return shape
		// 		}

		// 		// Create a new model for the new source file
		// 		if (shape.props) {
		// 			shape.props.assetId = asset.id
		// 		}

		// 		return shape
		// 	})
		// )

		// const filteredUpdates = compact(shapeUpdates)

		// editor.batch(() => {
		// 	editor.createAssets(compact([...newAssetsForFiles.values()]))
		// 	editor.createShapes(filteredUpdates)
		// 	editor.setSelectedIds(filteredUpdates.map((s) => s.id))

		// 	const { selectedIds, viewportPageBounds } = editor

		// 	const pageBounds = Box2d.Common(
		// 		compact(selectedIds.map((id) => editor.getPageBoundsById(id)))
		// 	)

		// 	if (pageBounds && !viewportPageBounds.contains(pageBounds)) {
		// 		editor.zoomToSelection()
		// 	}
		// })

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
			editor.createAssets(assets)
			editor.createShapes(paritals, true)

			// re-center partials around point
			const { viewportPageBounds } = editor
			let { selectedPageBounds } = editor

			if (selectedPageBounds) {
				const offset = selectedPageBounds!.center.sub(position)

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

			// Get the new selected bounds after moving the shapes
			selectedPageBounds = editor.selectedPageBounds

			if (selectedPageBounds && !viewportPageBounds.contains(selectedPageBounds)) {
				editor.zoomToSelection()
			}
		})
	}

	/**
	 * Override this method to change how assets are created from files.
	 *
	 * @param editor - The editor instance
	 * @param file - The file to create the asset from.
	 */
	async createAssetFromFile(_editor: Editor, file: File): Promise<TLAsset> {
		return await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onerror = () => reject(reader.error)
			reader.onload = async () => {
				let dataUrl = reader.result as string

				const isImageType = isImage(file.type)
				const sizeFn = isImageType ? getImageSizeFromSrc : getVideoSizeFromSrc

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
				}

				resolve(asset)
			}

			reader.readAsDataURL(file)
		})
	}

	/**
	 * Override me to change the way assets are created from urls.
	 *
	 * @param editor - The editor instance
	 * @param url - The url to create the asset from
	 */
	async createAssetFromUrl(_editor: Editor, url: string): Promise<TLAsset> {
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
		}
	}
}

/* --------------------- Helpers -------------------- */

const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/**
 * Replace any tabs with double spaces.
 * @param text - The text to replace tabs in.
 * @internal
 */
function replaceTabsWithSpaces(text: string) {
	return text.replace(/\t/g, INDENT)
}

/**
 * Strip common minimum indentation from each line.
 * @param text - The text to strip.
 * @internal
 */
function stripCommonMinimumIndentation(text: string): string {
	// Split the text into individual lines
	const lines = text.split('\n')

	// remove any leading lines that are only whitespace or newlines
	while (lines[0].trim().length === 0) {
		lines.shift()
	}

	let minIndentation = Infinity
	for (const line of lines) {
		if (line.trim().length > 0) {
			const indentation = line.length - line.trimStart().length
			minIndentation = Math.min(minIndentation, indentation)
		}
	}

	return lines.map((line) => line.slice(minIndentation)).join('\n')
}

/**
 * Strip trailing whitespace from each line and remove any trailing newlines.
 * @param text - The text to strip.
 * @internal
 */
function stripTrailingWhitespace(text: string): string {
	return text.replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
}
