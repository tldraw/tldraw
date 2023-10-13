import {
	AssetRecordType,
	Box2d,
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
	TLOpacityType,
	TLShapeId,
	Vec2d,
	VecLike,
	compact,
	createShapeId,
	getIndexAbove,
	getIndices,
	isShapeId,
	uniqueId,
} from '@tldraw/editor'

/**
 * When the clipboard has excalidraw content, paste it into the scene.
 *
 * @param editor - The editor instance.
 * @param clipboard - The clipboard model.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export async function pasteExcalidrawContent(editor: Editor, clipboard: any, point?: VecLike) {
	const { elements, files } = clipboard

	const tldrawContent: TLContent = {
		shapes: [],
		rootShapeIds: [],
		assets: [],
		schema: editor.store.schema.serialize(),
	}

	const groupShapeIdToChildren = new Map<string, TLShapeId[]>()
	const rotatedElements = new Map<TLShapeId, number>()

	const { currentPageId } = editor

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

	let index = 'a1'

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

				const assetId: TLAssetId = AssetRecordType.createId()
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

	editor.mark('paste')

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
	const bounds = Box2d.Common(rootShapes.map((s) => editor.getShapePageBounds(s)!))
	const viewPortCenter = editor.viewportPageBounds.center
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

const colorsToColors: Record<string, TLDefaultColorStyle> = {
	'#ffffff': 'grey',
	// Strokes
	'#000000': 'black',
	'#343a40': 'black',
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

const arrowheadsToArrowheadTypes: Record<string, TLArrowShapeArrowheadStyle> = {
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
