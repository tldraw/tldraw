import {
	App,
	createAssetShapeAtPoint,
	createBookmarkShapeAtPoint,
	createEmbedShapeAtPoint,
	createShapeId,
	createShapesFromFiles,
	FONT_FAMILIES,
	FONT_SIZES,
	getEmbedInfo,
	getIndexAbove,
	getIndices,
	getValidHttpURLList,
	isShapeId,
	isSvgText,
	isValidHttpURL,
	TEXT_PROPS,
	TLAlignType,
	TLArrowheadType,
	TLArrowShapeDef,
	TLAsset,
	TLAssetId,
	TLBookmarkShapeDef,
	TLClipboardModel,
	TLColorType,
	TLDashType,
	TLEmbedShapeDef,
	TLFillType,
	TLFontType,
	TLGeoShapeDef,
	TLOpacityType,
	TLShapeId,
	TLSizeType,
	TLTextShapeDef,
	uniqueId,
	useApp,
} from '@tldraw/editor'
import { Box2d, Vec2d, VecLike } from '@tldraw/primitives'
import { compact, isNonNull } from '@tldraw/utils'
import { compressToBase64, decompressFromBase64 } from 'lz-string'
import { useCallback, useEffect } from 'react'
import { useAppIsFocused } from './useAppIsFocused'
import { TLUiEventSource, useEvents } from './useEventsProvider'

/** @public */
export type EmbedInfo = {
	width: number
	height: number
	doesResize: boolean
	isEmbedUrl: (url: string) => boolean
	toEmbed: (url: string) => string
}

async function blobAsString(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('loadend', () => {
			const text = reader.result
			resolve(text as string)
		})
		reader.addEventListener('error', () => {
			reject(reader.error)
		})
		reader.readAsText(blob)
	})
}

async function dataTransferItemAsString(item: DataTransferItem) {
	return new Promise<string>((resolve) => {
		item.getAsString((text) => {
			resolve(text)
		})
	})
}

const INPUTS = ['input', 'select', 'textarea']

function disallowClipboardEvents(app: App) {
	const { activeElement } = document
	return (
		app.isMenuOpen ||
		(activeElement &&
			(activeElement.getAttribute('contenteditable') ||
				INPUTS.indexOf(activeElement.tagName.toLowerCase()) > -1))
	)
}

function stripHtml(html: string) {
	// See <https://github.com/developit/preact-markup/blob/4788b8d61b4e24f83688710746ee36e7464f7bbc/src/parse-markup.js#L60-L69>
	const doc = document.implementation.createHTMLDocument('')
	doc.documentElement.innerHTML = html
	return doc.body.textContent || doc.body.innerText || ''
}

// Clear the clipboard when the user copies nothing
const clearPersistedClipboard = () => {
	window.navigator.clipboard.writeText('')
}

/**
 * Write serialized data to the local storage.
 *
 * @param data - The string to write.
 * @param kind - The kind of data to write.
 * @internal
 */
const getStringifiedClipboard = (data: any, kind: 'text' | 'file' | 'content') => {
	const s = compressToBase64(
		JSON.stringify({
			type: 'application/tldraw',
			kind,
			data,
		})
	)

	return s
}

/**
 * When the clipboard has tldraw content, paste it into the scene.
 *
 * @param clipboard - The clipboard model.
 * @param point - The center point at which to paste the content.
 * @internal
 */
const pasteTldrawContent = async (app: App, clipboard: TLClipboardModel, point?: VecLike) => {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : undefined)

	app.mark('paste')
	app.putContent(clipboard, {
		point: p,
		select: true,
	})
}

/**
 * When the clipboard has plain text, create a text shape and insert it into the scene
 *
 * @param text - The text to paste.
 * @param point - The point at which to paste the text.
 * @internal
 */
const pastePlainText = async (app: App, text: string, point?: VecLike) => {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)
	const defaultProps = app.getShapeUtilByDef(TLTextShapeDef).defaultProps()

	// Measure the text with default values
	const { w, h } = app.textMeasure.measureText({
		...TEXT_PROPS,
		text: stripHtml(text),
		fontFamily: FONT_FAMILIES[defaultProps.font],
		fontSize: FONT_SIZES[defaultProps.size],
		width: 'fit-content',
	})

	app.mark('paste')
	app.createShapes([
		{
			id: createShapeId(),
			type: 'text',
			x: p.x - w / 2,
			y: p.y - h / 2,
			props: {
				text: stripHtml(text),
				autoSize: true,
			},
		},
	])
}

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene
 *
 * @param url - The URL to paste.
 * @param point - The point at which to paste the file.
 * @internal
 */
const pasteUrl = async (app: App, url: string, point?: VecLike) => {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)

	// Lets see if its an image and we have CORs
	try {
		const resp = await fetch(url)
		if (resp.headers.get('content-type')?.match(/^image\//)) {
			app.mark('paste')
			pasteFiles(app, [url])
			return
		}
	} catch (err: any) {
		if (err.message !== 'Failed to fetch') {
			console.error(err)
		}
	}

	const embedInfo = getEmbedInfo(url)

	if (embedInfo) {
		app.mark('paste')
		createEmbedShapeAtPoint(app, embedInfo.url, p, embedInfo.definition)
	} else {
		app.mark('paste')
		await createBookmarkShapeAtPoint(app, url, p)
	}
}

const pasteSvgText = async (app: App, text: string, point?: VecLike) => {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)

	app.mark('paste')
	await createAssetShapeAtPoint(app, text, p)
}

/**
 * When the clipboard has a file, create an image shape from the file and paste it into the scene
 *
 * @param url - The file's url.
 * @param point - The point at which to paste the file.
 * @internal
 */
const pasteFiles = async (app: App, urls: string[], point?: VecLike) => {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)

	const blobs = await Promise.all(urls.map(async (url) => await (await fetch(url)).blob()))

	const files = blobs.map(
		(blob) =>
			new File([blob], 'tldrawFile', {
				type: blob.type,
			})
	)

	app.mark('paste')
	await createShapesFromFiles(app, files, p, false)

	urls.forEach((url) => URL.revokeObjectURL(url))
}

/**
 * When the user copies, write the contents to local storage and to the clipboard
 *
 * @param app - App
 * @public
 */
const handleMenuCopy = (app: App) => {
	const content = app.getContent()
	if (!content) {
		clearPersistedClipboard()
		return
	}

	const stringifiedClipboard = getStringifiedClipboard(content, 'content')

	if (typeof window?.navigator !== 'undefined') {
		// Extract the text from the clipboard
		const textItems = content.shapes
			.map((shape) => {
				if (TLTextShapeDef.is(shape) || TLGeoShapeDef.is(shape) || TLArrowShapeDef.is(shape)) {
					return shape.props.text
				}
				if (TLBookmarkShapeDef.is(shape) || TLEmbedShapeDef.is(shape)) {
					return shape.props.url
				}
				return null
			})
			.filter(isNonNull)

		if (navigator.clipboard?.write) {
			const htmlBlob = new Blob([`<tldraw>${stringifiedClipboard}</tldraw>`], {
				type: 'text/html',
			})

			let textContent = textItems.join(' ')

			// This is a bug in chrome android where it won't paste content if
			// the text/plain content is "" so we need to always add an empty
			// space 🤬
			if (textContent === '') {
				textContent = ' '
			}

			navigator.clipboard.write([
				new ClipboardItem({
					'text/html': htmlBlob,
					'text/plain': new Blob([textContent], { type: 'text/plain' }),
				}),
			])
		} else if (navigator.clipboard.writeText) {
			navigator.clipboard.writeText(`<tldraw>${stringifiedClipboard}</tldraw>`)
		}
	}
}

const pasteText = (app: App, data: string, point?: VecLike) => {
	const validUrlList = getValidHttpURLList(data)
	if (validUrlList) {
		for (const url of validUrlList) {
			pasteUrl(app, url, point)
		}
	} else if (isValidHttpURL(data)) {
		pasteUrl(app, data, point)
	} else if (isSvgText(data)) {
		pasteSvgText(app, data, point)
	} else {
		pastePlainText(app, data, point)
	}
}

async function pasteExcalidrawContent(app: App, clipboard: any, point?: VecLike) {
	const { elements, files } = clipboard

	const tldrawContent: TLClipboardModel = {
		shapes: [],
		rootShapeIds: [],
		assets: [],
		schema: app.store.schema.serialize(),
	}

	const groupShapeIdToChildren = new Map<string, TLShapeId[]>()
	const rotatedElements = new Map<TLShapeId, number>()

	const getOpacity = (opacity: number): TLOpacityType => {
		const t = opacity / 100
		if (t < 0.2) {
			return '0.1'
		} else if (t < 0.4) {
			return '0.25'
		} else if (t < 0.6) {
			return '0.5'
		} else if (t < 0.8) {
			return '0.75'
		}

		return '1'
	}

	const strokeWidthsToSizes: Record<number, TLSizeType> = {
		1: 's',
		2: 'm',
		3: 'l',
		4: 'xl',
	}

	const fontSizesToSizes: Record<number, TLSizeType> = {
		16: 's',
		20: 'm',
		28: 'l',
		36: 'xl',
	}

	function getFontSizeAndScale(fontSize: number): { size: TLSizeType; scale: number } {
		const size = fontSizesToSizes[fontSize]
		if (size) {
			return { size, scale: 1 }
		}
		if (fontSize < 16) {
			return { size: 's', scale: fontSize / 16 }
		}
		if (fontSize > 36) {
			return { size: 'xl', scale: fontSize / 36 }
		}
		return { size: 'm', scale: 1 }
	}

	const fontFamilyToFontType: Record<number, TLFontType> = {
		1: 'draw',
		2: 'sans',
		3: 'mono',
	}

	const colorsToColors: Record<string, TLColorType> = {
		'#ffffff': 'grey',
		// Strokes
		'#000000': 'black',
		'#343a40': 'grey',
		'#495057': 'grey',
		'#c92a2a': 'red',
		'#a61e4d': 'light-red',
		'#862e9c': 'violet',
		'#5f3dc4': 'light-violet',
		'#364fc7': 'blue',
		'#1864ab': 'light-blue',
		'#0b7285': 'light-green',
		'#087f5b': 'light-green',
		'#2b8a3e': 'green',
		'#5c940d': 'light-green',
		'#e67700': 'yellow',
		'#d9480f': 'orange',
		// Backgrounds
		'#ced4da': 'grey',
		'#868e96': 'grey',
		'#fa5252': 'light-red',
		'#e64980': 'red',
		'#be4bdb': 'light-violet',
		'#7950f2': 'violet',
		'#4c6ef5': 'blue',
		'#228be6': 'light-blue',
		'#15aabf': 'light-green',
		'#12b886': 'green',
		'#40c057': 'green',
		'#82c91e': 'light-green',
		'#fab005': 'yellow',
		'#fd7e14': 'orange',
		'#212529': 'grey',
	}

	const strokeStylesToStrokeTypes: Record<string, TLDashType> = {
		solid: 'draw',
		dashed: 'dashed',
		dotted: 'dotted',
	}

	const fillStylesToFillType: Record<string, TLFillType> = {
		'cross-hatch': 'pattern',
		hachure: 'pattern',
		solid: 'solid',
	}

	const textAlignToAlignTypes: Record<string, TLAlignType> = {
		left: 'start',
		center: 'middle',
		right: 'end',
	}

	const arrowheadsToArrowheadTypes: Record<string, TLArrowheadType> = {
		arrow: 'arrow',
		dot: 'dot',
		triangle: 'triangle',
		bar: 'pipe',
	}

	function getBend(element: any, startPoint: any, endPoint: any) {
		let bend = 0
		if (element.points.length > 2) {
			const start = new Vec2d(startPoint[0], startPoint[1])
			const end = new Vec2d(endPoint[0], endPoint[1])
			const handle = new Vec2d(element.points[1][0], element.points[1][1])
			const delta = Vec2d.Sub(end, start)
			const v = Vec2d.Per(delta)

			const med = Vec2d.Med(end, start)
			const A = Vec2d.Sub(med, v)
			const B = Vec2d.Add(med, v)

			const point = Vec2d.NearestPointOnLineSegment(A, B, handle, false)
			bend = Vec2d.Dist(point, med)
			if (Vec2d.Clockwise(point, end, med)) bend *= -1
		}
		return bend
	}

	const getDash = (element: any): TLDashType => {
		let dash: TLDashType = strokeStylesToStrokeTypes[element.strokeStyle] ?? 'draw'
		if (dash === 'draw' && element.roughness === 0) {
			dash = 'solid'
		}
		return dash
	}

	const getFill = (element: any): TLFillType => {
		if (element.backgroundColor === 'transparent') {
			return 'none'
		}
		return fillStylesToFillType[element.fillStyle] ?? 'solid'
	}

	const { currentPageId } = app

	let index = 'a1'

	const excElementIdsToTldrawShapeIds = new Map<string, TLShapeId>()
	const rootShapeIds: TLShapeId[] = []

	const skipIds = new Set<string>()

	elements.forEach((element: any) => {
		excElementIdsToTldrawShapeIds.set(element.id, app.createShapeId())

		if (element.boundElements !== null) {
			for (const boundElement of element.boundElements) {
				if (boundElement.type === 'text') {
					skipIds.add(boundElement.id)
				}
			}
		}
	})

	for (const element of elements) {
		if (skipIds.has(element.id)) {
			continue
		}

		const id = excElementIdsToTldrawShapeIds.get(element.id)!

		const base = {
			id,
			typeName: 'shape',
			parentId: currentPageId,
			index,
			x: element.x,
			y: element.y,
			rotation: 0,
			isLocked: element.locked,
		} as const

		if (element.angle !== 0) {
			rotatedElements.set(id, element.angle)
		}

		if (element.groupIds && element.groupIds.length > 0) {
			if (groupShapeIdToChildren.has(element.groupIds[0])) {
				groupShapeIdToChildren.get(element.groupIds[0])?.push(id)
			} else {
				groupShapeIdToChildren.set(element.groupIds[0], [id])
			}
		} else {
			rootShapeIds.push(id)
		}

		switch (element.type) {
			case 'rectangle':
			case 'ellipse':
			case 'diamond': {
				let text = ''
				let align: TLAlignType = 'middle'

				if (element.boundElements !== null) {
					for (const boundElement of element.boundElements) {
						if (boundElement.type === 'text') {
							const labelElement = elements.find((elm: any) => elm.id === boundElement.id)
							if (labelElement) {
								text = labelElement.text
								align = textAlignToAlignTypes[labelElement.textAlign]
							}
						}
					}
				}
				const colorToUse =
					element.backgroundColor === 'transparent' ? element.strokeColor : element.backgroundColor

				tldrawContent.shapes.push({
					...base,
					type: 'geo',
					props: {
						geo: element.type,
						opacity: getOpacity(element.opacity),
						url: element.link ?? '',
						w: element.width,
						h: element.height,
						size: strokeWidthsToSizes[element.strokeWidth] ?? 'draw',
						color: colorsToColors[colorToUse] ?? 'black',
						text,
						align,
						dash: getDash(element),
						fill: getFill(element),
					},
				})
				break
			}
			case 'freedraw': {
				tldrawContent.shapes.push({
					...base,
					type: 'draw',
					props: {
						dash: getDash(element),
						size: strokeWidthsToSizes[element.strokeWidth],
						opacity: getOpacity(element.opacity),
						color: colorsToColors[element.strokeColor] ?? 'black',
						segments: [
							{
								type: 'free',
								points: element.points.map(([x, y, z = 0.5]: number[]) => ({
									x,
									y,
									z,
								})),
							},
						],
					},
				})
				break
			}
			case 'line': {
				const start = element.points[0]
				const end = element.points[element.points.length - 1]
				const indices = getIndices(element.points.length)

				tldrawContent.shapes.push({
					...base,
					type: 'line',
					props: {
						dash: getDash(element),
						size: strokeWidthsToSizes[element.strokeWidth],
						opacity: getOpacity(element.opacity),
						color: colorsToColors[element.strokeColor] ?? 'black',
						spline: element.roundness ? 'cubic' : 'line',
						handles: {
							start: {
								id: 'start',
								type: 'vertex',
								index: indices[0],
								x: start[0],
								y: start[1],
							},
							end: {
								id: 'end',
								type: 'vertex',
								index: indices[indices.length - 1],
								x: end[0],
								y: end[1],
							},
							...Object.fromEntries(
								element.points.slice(1, -1).map(([x, y]: number[], i: number) => {
									const id = uniqueId()
									return [
										id,
										{
											id,
											type: 'vertex',
											index: indices[i + 1],
											x,
											y,
										},
									]
								})
							),
						},
					},
				})
				break
			}
			case 'arrow': {
				let text = ''

				if (element.boundElements !== null) {
					for (const boundElement of element.boundElements) {
						if (boundElement.type === 'text') {
							const labelElement = elements.find((elm: any) => elm.id === boundElement.id)
							if (labelElement) {
								text = labelElement.text
							}
						}
					}
				}

				const start = element.points[0]
				const end = element.points[element.points.length - 1]

				const startTargetId = excElementIdsToTldrawShapeIds.get(element.startBinding?.elementId)
				const endTargetId = excElementIdsToTldrawShapeIds.get(element.endBinding?.elementId)

				tldrawContent.shapes.push({
					...base,
					type: 'arrow',
					props: {
						text,
						bend: getBend(element, start, end),
						dash: getDash(element),
						opacity: getOpacity(element.opacity),
						size: strokeWidthsToSizes[element.strokeWidth] ?? 'm',
						color: colorsToColors[element.strokeColor] ?? 'black',
						start: startTargetId
							? {
									type: 'binding',
									boundShapeId: startTargetId,
									normalizedAnchor: { x: 0.5, y: 0.5 },
									isExact: false,
							  }
							: {
									type: 'point',
									x: start[0],
									y: start[1],
							  },
						end: endTargetId
							? {
									type: 'binding',
									boundShapeId: endTargetId,
									normalizedAnchor: { x: 0.5, y: 0.5 },
									isExact: false,
							  }
							: {
									type: 'point',
									x: end[0],
									y: end[1],
							  },
						arrowheadEnd: arrowheadsToArrowheadTypes[element.endArrowhead] ?? 'none',
						arrowheadStart: arrowheadsToArrowheadTypes[element.startArrowhead] ?? 'none',
					},
				})
				break
			}
			case 'text': {
				const { size, scale } = getFontSizeAndScale(element.fontSize)

				tldrawContent.shapes.push({
					...base,
					type: 'text',
					props: {
						size,
						scale,
						font: fontFamilyToFontType[element.fontFamily] ?? 'draw',
						opacity: getOpacity(element.opacity),
						color: colorsToColors[element.strokeColor] ?? 'black',
						text: element.text,
						align: textAlignToAlignTypes[element.textAlign],
					},
				})
				break
			}
			case 'image': {
				const file = files[element.fileId]
				if (!file) break

				const assetId: TLAssetId = TLAsset.createId()
				tldrawContent.assets.push({
					id: assetId,
					typeName: 'asset',
					type: 'image',
					props: {
						w: element.width,
						h: element.height,
						name: element.id ?? 'Untitled',
						isAnimated: false,
						mimeType: file.mimeType,
						src: file.dataURL,
					},
				})

				tldrawContent.shapes.push({
					...base,
					type: 'image',
					props: {
						opacity: getOpacity(element.opacity),
						w: element.width,
						h: element.height,
						assetId,
					},
				})
			}
		}

		index = getIndexAbove(index)
	}

	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : undefined)

	app.mark('paste')

	app.putContent(tldrawContent, {
		point: p,
		select: false,
		preserveIds: true,
	})
	for (const groupedShapeIds of groupShapeIdToChildren.values()) {
		if (groupedShapeIds.length > 1) {
			app.groupShapes(groupedShapeIds)
			const groupShape = app.getShapeById(groupedShapeIds[0])
			if (groupShape?.parentId && isShapeId(groupShape.parentId)) {
				rootShapeIds.push(groupShape.parentId)
			}
		}
	}

	for (const [id, angle] of rotatedElements) {
		app.select(id)
		app.rotateShapesBy([id], angle)
	}

	const rootShapes = compact(rootShapeIds.map((id) => app.getShapeById(id)))
	const bounds = Box2d.Common(rootShapes.map((s) => app.getPageBounds(s)!))
	const viewPortCenter = app.viewportPageBounds.center
	app.updateShapes(
		rootShapes.map((s) => {
			const delta = {
				x: (s.x ?? 0) - (bounds.x + bounds.w / 2),
				y: (s.y ?? 0) - (bounds.y + bounds.h / 2),
			}

			return {
				id: s.id,
				type: s.type,
				x: viewPortCenter.x + delta.x,
				y: viewPortCenter.y + delta.y,
			}
		})
	)
	app.setSelectedIds(rootShapeIds)
}

const handleFilesBlob = async (app: App, blobs: Blob[], point?: VecLike) => {
	const urls = blobs.map((blob) => URL.createObjectURL(blob))

	pasteFiles(app, urls, point)
}

const handleHtmlString = async (app: App, html: string, point?: VecLike) => {
	const s = html.match(/<tldraw[^>]*>(.*)<\/tldraw>/)?.[1]
	if (s) {
		try {
			const json = JSON.parse(decompressFromBase64(s)!)
			if (json.type === 'application/tldraw') {
				pasteTldrawContent(app, json.data, point)
			} else {
				pasteText(app, s, point)
			}
		} catch (error) {
			pasteText(app, s, point)
		}
	} else {
		const rootNode = new DOMParser().parseFromString(html, 'text/html')
		const bodyNode = rootNode.querySelector('body')

		// Edge on Windows 11 home appears to paste a link as a single <a/> in
		// the HTML document. If we're pasting a single like tag we'll just
		// assume the user meant to paste the URL.
		const isHtmlSingleLink =
			bodyNode &&
			Array.from(bodyNode.children).filter((el) => el.nodeType === 1).length === 1 &&
			bodyNode.firstElementChild &&
			bodyNode.firstElementChild.tagName === 'A' &&
			bodyNode.firstElementChild.hasAttribute('href') &&
			bodyNode.firstElementChild.getAttribute('href') !== ''

		if (isHtmlSingleLink) {
			const href = bodyNode.firstElementChild.getAttribute('href')!
			pasteText(app, href, point)
		} else {
			pasteText(app, html, point)
		}
	}
}

const handleTextString = async (app: App, text: string, point?: VecLike) => {
	const s = text.trim()

	const tldrawContent = text.match(/<tldraw[^>]*>(.*)<\/tldraw>/)?.[1]
	if (tldrawContent) {
		handleHtmlString(app, text)
	} else if (s) {
		try {
			const json = JSON.parse(s)
			if (json.type === 'application/tldraw') {
				pasteTldrawContent(app, json.data, point)
			} else if (json.type === 'excalidraw/clipboard') {
				pasteExcalidrawContent(app, json, point)
			} else {
				pasteText(app, s, point)
			}
		} catch (error) {
			pasteText(app, s, point)
		}
	}
}

const handleNativeDataTransferPaste = async (
	app: App,
	clipboardData: DataTransfer,
	point?: VecLike
) => {
	// Do not paste while in any editing state
	if (app.isIn('select.editing')) return

	if (clipboardData) {
		const items = Object.values(clipboardData.items)

		// In some cases, the clipboard will contain both the name of a file and the file itself
		// we need to avoid writing a text shape for the name AND an image or video shape for the file
		const writingFile = items.some((item) => item.kind === 'file')

		// If we're pasting in tldraw content (shapes, etc) then the clipboard may
		// contain both text content. We'll only paste the content.
		const writingContent = items.some((item) => item.type === 'text/html')

		// We need to handle files separately because if we want them to
		// be placed next to each other, we need to create them all at once

		const files: Blob[] = []
		const text: DataTransferItem[] = []

		items.forEach((item) => {
			if (item.kind === 'file') {
				const file = item.getAsFile()
				if (file) {
					files.push(file)
				}
			} else if (item.kind === 'string') {
				text.push(item)
			}
		})

		if (files.length > 0) {
			handleFilesBlob(app, files, point)
		}

		for (const item of text) {
			if (!writingFile && item.type === 'text/html') {
				await handleHtmlString(app, await dataTransferItemAsString(item), point)
			} else if (item.type === 'text/plain') {
				if (!writingContent) {
					await handleTextString(app, await dataTransferItemAsString(item), point)
				}
			}
		}
	}
}

const handleNativeClipboardPaste = async (
	app: App,
	clipboardItems: ClipboardItem[],
	point?: VecLike
) => {
	// Do not paste while in any editing state
	if (app.isIn('select.editing')) return

	const isFile = (item: ClipboardItem) => {
		return item.types.find((i) => i.match(/^image\//))
	}

	// In some cases, the clipboard will contain both the name of a file and the file itself
	// we need to avoid writing a text shape for the name AND an image or video shape for the file
	const writingFile = clipboardItems.some((item) => isFile(item))

	// If we're pasting in tldraw content (shapes, etc) then the clipboard may
	// contain both text content. We'll only paste the content.
	const writingContent = clipboardItems.some((item) => item.types.includes('text/html'))

	// We need to handle files separately because if we want them to
	// be placed next to each other, we need to create them all at once

	const files: ClipboardItem[] = clipboardItems.filter((item) => {
		if (item.types.find((i) => i.match(/^image\//))) {
			return true
		}

		return false
	})

	await Promise.all(
		files.map(async (item) => {
			const type = item.types.find((t) => t !== 'text/plain' && t !== 'text/html')
			if (type) {
				const file = await item.getType(type)
				if (file) {
					await handleFilesBlob(app, [file], point)
				}
			}
		})
	)

	for (const item of clipboardItems) {
		if (item.types.includes('text/html')) {
			if (writingFile) break

			const blob = await item.getType('text/html')
			await handleHtmlString(app, await blobAsString(blob), point)
		} else if (item.types.includes('text/uri-list')) {
			if (writingContent) break

			const blob = await item.getType('text/uri-list')
			await pasteUrl(app, await blobAsString(blob), point)
		} else if (item.types.includes('text/plain')) {
			if (writingContent) break

			const blob = await item.getType('text/plain')
			await handleTextString(app, await blobAsString(blob), point)
		}
	}
}

/** @public */
export function useMenuClipboardEvents(source: TLUiEventSource) {
	const app = useApp()
	const trackEvent = useEvents()

	const copy = useCallback(
		function onCopy() {
			if (app.selectedIds.length === 0) return

			handleMenuCopy(app)
			trackEvent('copy', { source })
		},
		[app, trackEvent, source]
	)

	const cut = useCallback(
		function onCut() {
			if (app.selectedIds.length === 0) return

			handleMenuCopy(app)
			app.deleteShapes()
			trackEvent('cut', { source })
		},
		[app, trackEvent, source]
	)

	const paste = useCallback(
		async function onPaste(data: DataTransfer | ClipboardItem[], point?: VecLike) {
			if (Array.isArray(data) && data[0] instanceof ClipboardItem) {
				handleNativeClipboardPaste(app, data, point)
			} else {
				navigator.clipboard.read().then((clipboardItems) => {
					paste(clipboardItems, app.inputs.currentPagePoint)
				})
			}

			// else {
			// 	handleScenePaste(app, point)
			// }

			trackEvent('paste', { source: 'menu' })
		},
		[app, trackEvent]
	)

	return {
		copy,
		cut,
		paste,
	}
}

/** @public */
export function useNativeClipboardEvents() {
	const app = useApp()
	const trackEvent = useEvents()

	const appIsFocused = useAppIsFocused()

	useEffect(() => {
		if (!appIsFocused) return
		const copy = () => {
			if (app.selectedIds.length === 0 || app.editingId !== null || disallowClipboardEvents(app))
				return
			handleMenuCopy(app)
			trackEvent('copy', { source: 'kbd' })
		}

		function cut() {
			if (app.selectedIds.length === 0 || app.editingId !== null || disallowClipboardEvents(app))
				return
			handleMenuCopy(app)
			app.deleteShapes()
			trackEvent('cut', { source: 'kbd' })
		}

		const paste = (e: ClipboardEvent) => {
			if (app.editingId !== null || disallowClipboardEvents(app)) return
			if (e.clipboardData && !app.inputs.shiftKey) {
				handleNativeDataTransferPaste(app, e.clipboardData)
			} else {
				navigator.clipboard.read().then((clipboardItems) => {
					if (Array.isArray(clipboardItems) && clipboardItems[0] instanceof ClipboardItem) {
						handleNativeClipboardPaste(app, clipboardItems, app.inputs.currentPagePoint)
					}
				})
			}
			trackEvent('paste', { source: 'kbd' })
		}

		document.addEventListener('copy', copy)
		document.addEventListener('cut', cut)
		document.addEventListener('paste', paste)

		return () => {
			document.removeEventListener('copy', copy)
			document.removeEventListener('cut', cut)
			document.removeEventListener('paste', paste)
		}
	}, [app, trackEvent, appIsFocused])
}
