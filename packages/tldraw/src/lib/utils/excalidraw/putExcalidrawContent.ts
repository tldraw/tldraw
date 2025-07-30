import {
	AssetRecordType,
	Box,
	Editor,
	TLArrowShapeArrowheadStyle,
	TLAssetId,
	TLContent,
	TLDefaultColorStyle,
	TLDefaultDashStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultTextAlignStyle,
	TLOpacityType,
	TLShapeId,
	Vec,
	VecLike,
	ZERO_INDEX_KEY,
	compact,
	createBindingId,
	createShapeId,
	getIndexAbove,
	getIndices,
	isShapeId,
	toRichText,
} from '@tldraw/editor'

/**
 * Put excalidraw clipboard content onto the current page.
 *
 * @param editor - The editor instance.
 * @param excalidrawClipboardContent - The excalidraw clipboard model.
 * @param point - The point at which to put the excalidraw content.
 * @public
 */
export async function putExcalidrawContent(
	editor: Editor,
	excalidrawClipboardContent: any,
	point?: VecLike
) {
	const { elements, files } = excalidrawClipboardContent

	const tldrawContent: TLContent = {
		shapes: [],
		bindings: [],
		rootShapeIds: [],
		assets: [],
		schema: editor.store.schema.serialize(),
	}

	const groupShapeIdToChildren = new Map<string, TLShapeId[]>()
	const rotatedElements = new Map<TLShapeId, number>()

	const currentPageId = editor.getCurrentPageId()

	const excElementIdsToTldrawShapeIds = new Map<string, TLShapeId>()
	const rootShapeIds: TLShapeId[] = []

	const skipIds = new Set<string>()

	elements.forEach((element: any) => {
		excElementIdsToTldrawShapeIds.set(element.id, createShapeId())

		if (element.boundElements !== null) {
			for (const boundElement of element.boundElements) {
				if (boundElement.type === 'text') {
					skipIds.add(boundElement.id)
				}
			}
		}
	})

	let index = ZERO_INDEX_KEY

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
			opacity: getOpacity(element.opacity),
			meta: {},
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
				let align: TLDefaultHorizontalAlignStyle = 'middle'

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
						url: element.link ?? '',
						w: element.width,
						h: element.height,
						size: strokeWidthsToSizes[element.strokeWidth] ?? 'draw',
						color: colorsToColors[colorToUse] ?? 'black',
						richText: toRichText(text),
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
				const points = element.points.slice()
				if (points.length < 2) {
					break
				}
				const indices = getIndices(element.points.length)

				tldrawContent.shapes.push({
					...base,
					type: 'line',
					props: {
						dash: getDash(element),
						size: strokeWidthsToSizes[element.strokeWidth],
						color: colorsToColors[element.strokeColor] ?? 'black',
						spline: element.roundness ? 'cubic' : 'line',
						points: {
							...Object.fromEntries(
								element.points.map(([x, y]: number[], i: number) => {
									const index = indices[i]
									return [index, { id: index, index, x, y }]
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
						richText: toRichText(text),
						kind: element.elbowed ? 'elbow' : 'arc',
						bend: getBend(element, start, end),
						dash: getDash(element),
						size: strokeWidthsToSizes[element.strokeWidth] ?? 'm',
						color: colorsToColors[element.strokeColor] ?? 'black',
						start: { x: start[0], y: start[1] },
						end: { x: end[0], y: end[1] },
						arrowheadEnd: arrowheadsToArrowheadTypes[element.endArrowhead] ?? 'none',
						arrowheadStart: arrowheadsToArrowheadTypes[element.startArrowhead] ?? 'none',
					},
				})

				if (startTargetId) {
					tldrawContent.bindings!.push({
						id: createBindingId(),
						typeName: 'binding',
						type: 'arrow',
						fromId: id,
						toId: startTargetId,
						props: {
							terminal: 'start',
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isPrecise: false,
							isExact: false,
						},
						meta: {},
					})
				}
				if (endTargetId) {
					tldrawContent.bindings!.push({
						id: createBindingId(),
						typeName: 'binding',
						type: 'arrow',
						fromId: id,
						toId: endTargetId,
						props: {
							terminal: 'end',
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isPrecise: false,
							isExact: false,
						},
						meta: {},
					})
				}
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
						color: colorsToColors[element.strokeColor] ?? 'black',
						richText: toRichText(element.text),
						textAlign: textAlignToTextAlignTypes[element.textAlign],
					},
				})
				break
			}
			case 'image': {
				const file = files[element.fileId]
				if (!file) break

				const assetId: TLAssetId = AssetRecordType.createId()
				tldrawContent.assets.push({
					id: assetId,
					typeName: 'asset',
					type: 'image',
					props: {
						w: element.width,
						h: element.height,
						fileSize: file.size,
						name: element.id ?? 'Untitled',
						isAnimated: false,
						mimeType: file.mimeType,
						src: file.dataURL,
					},
					meta: {},
				})

				tldrawContent.shapes.push({
					...base,
					type: 'image',
					props: {
						w: element.width,
						h: element.height,
						assetId,
					},
				})
			}
		}

		index = getIndexAbove(index)
	}

	const p = point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : undefined)

	editor.putContentOntoCurrentPage(tldrawContent, {
		point: p,
		select: false,
		preserveIds: true,
	})
	for (const groupedShapeIds of groupShapeIdToChildren.values()) {
		if (groupedShapeIds.length > 1) {
			editor.groupShapes(groupedShapeIds)
			const groupShape = editor.getShape(groupedShapeIds[0])
			if (groupShape?.parentId && isShapeId(groupShape.parentId)) {
				rootShapeIds.push(groupShape.parentId)
			}
		}
	}

	for (const [id, angle] of rotatedElements) {
		editor.select(id)
		editor.rotateShapesBy([id], angle)
	}

	const rootShapes = compact(rootShapeIds.map((id) => editor.getShape(id)))
	const bounds = Box.Common(rootShapes.map((s) => editor.getShapePageBounds(s)!))
	const viewPortCenter = editor.getViewportPageBounds().center
	editor.updateShapes(
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
	editor.setSelectedShapes(rootShapeIds)
}

/* --------------- Translating Helpers --------_------ */

const getOpacity = (opacity: number): TLOpacityType => {
	const t = opacity / 100
	if (t < 0.2) {
		return 0.1
	} else if (t < 0.4) {
		return 0.25
	} else if (t < 0.6) {
		return 0.5
	} else if (t < 0.8) {
		return 0.75
	}

	return 1
}

const strokeWidthsToSizes: Record<number, TLDefaultSizeStyle> = {
	1: 's',
	2: 'm',
	3: 'l',
	4: 'xl',
}

const fontSizesToSizes: Record<number, TLDefaultSizeStyle> = {
	16: 's',
	20: 'm',
	28: 'l',
	36: 'xl',
}

function getFontSizeAndScale(fontSize: number): { size: TLDefaultSizeStyle; scale: number } {
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

const fontFamilyToFontType: Record<number, TLDefaultFontStyle> = {
	1: 'draw',
	2: 'sans',
	3: 'mono',
}

const oc = {
	gray: ['#f8f9fa', '#e9ecef', '#ced4da', '#868e96', '#343a40'],
	red: ['#fff5f5', '#ffc9c9', '#ff8787', '#fa5252', '#e03131'],
	pink: ['#fff0f6', '#fcc2d7', '#f783ac', '#e64980', '#c2255c'],
	grape: ['#f8f0fc', '#eebefa', '#da77f2', '#be4bdb', '#9c36b5'],
	violet: ['#f3f0ff', '#d0bfff', '#9775fa', '#7950f2', '#6741d9'],
	indigo: ['#edf2ff', '#bac8ff', '#748ffc', '#4c6ef5', '#3b5bdb'],
	blue: ['#e7f5ff', '#a5d8ff', '#4dabf7', '#228be6', '#1971c2'],
	cyan: ['#e3fafc', '#99e9f2', '#3bc9db', '#15aabf', '#0c8599'],
	teal: ['#e6fcf5', '#96f2d7', '#38d9a9', '#12b886', '#099268'],
	green: ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2f9e44'],
	lime: ['#f4fce3', '#d8f5a2', '#a9e34b', '#82c91e', '#66a80f'],
	yellow: ['#fff9db', '#ffec99', '#ffd43b', '#fab005', '#f08c00'],
	orange: ['#fff4e6', '#ffd8a8', '#ffa94d', '#fd7e14', '#e8590c'],
}

function mapExcalidrawColorToTldrawColors(
	excalidrawColor: keyof typeof oc,
	light: TLDefaultColorStyle,
	dark: TLDefaultColorStyle
) {
	const colors = [0, 1, 2, 3, 4].map((index) => oc[excalidrawColor][index])
	return Object.fromEntries(colors.map((c, i) => [c, i < 3 ? light : dark]))
}

const colorsToColors: Record<string, TLDefaultColorStyle> = {
	...mapExcalidrawColorToTldrawColors('gray', 'grey', 'black'),
	...mapExcalidrawColorToTldrawColors('red', 'light-red', 'red'),
	...mapExcalidrawColorToTldrawColors('pink', 'light-red', 'red'),
	...mapExcalidrawColorToTldrawColors('grape', 'light-violet', 'violet'),
	...mapExcalidrawColorToTldrawColors('blue', 'light-blue', 'blue'),
	...mapExcalidrawColorToTldrawColors('cyan', 'light-blue', 'blue'),
	...mapExcalidrawColorToTldrawColors('teal', 'light-green', 'green'),
	...mapExcalidrawColorToTldrawColors('green', 'light-green', 'green'),
	...mapExcalidrawColorToTldrawColors('yellow', 'yellow', 'orange'),
	...mapExcalidrawColorToTldrawColors('orange', 'yellow', 'orange'),
	'#ffffff': 'white',
	'#000000': 'black',
}

const strokeStylesToStrokeTypes: Record<string, TLDefaultDashStyle> = {
	solid: 'draw',
	dashed: 'dashed',
	dotted: 'dotted',
}

const fillStylesToFillType: Record<string, TLDefaultFillStyle> = {
	'cross-hatch': 'pattern',
	hachure: 'pattern',
	solid: 'solid',
}

const textAlignToAlignTypes: Record<string, TLDefaultHorizontalAlignStyle> = {
	left: 'start',
	center: 'middle',
	right: 'end',
}

const textAlignToTextAlignTypes: Record<string, TLDefaultTextAlignStyle> = {
	left: 'start',
	center: 'middle',
	right: 'end',
}

const arrowheadsToArrowheadTypes: Record<string, TLArrowShapeArrowheadStyle> = {
	arrow: 'arrow',
	dot: 'dot',
	triangle: 'triangle',
	bar: 'pipe',
}

function getBend(element: any, startPoint: any, endPoint: any) {
	let bend = 0
	if (element.points.length > 2) {
		const start = new Vec(startPoint[0], startPoint[1])
		const end = new Vec(endPoint[0], endPoint[1])
		const handle = new Vec(element.points[1][0], element.points[1][1])
		const delta = Vec.Sub(end, start)
		const v = Vec.Per(delta)

		const med = Vec.Med(end, start)
		const A = Vec.Sub(med, v)
		const B = Vec.Add(med, v)

		const point = Vec.NearestPointOnLineSegment(A, B, handle, false)
		bend = Vec.Dist(point, med)
		if (Vec.Clockwise(point, end, med)) bend *= -1
	}
	return bend
}

const getDash = (element: any): TLDefaultDashStyle => {
	let dash: TLDefaultDashStyle = strokeStylesToStrokeTypes[element.strokeStyle] ?? 'draw'
	if (dash === 'draw' && element.roughness === 0) {
		dash = 'solid'
	}
	return dash
}

const getFill = (element: any): TLDefaultFillStyle => {
	if (element.backgroundColor === 'transparent') {
		return 'none'
	}
	return fillStylesToFillType[element.fillStyle] ?? 'solid'
}
