import {
	AssetRecordType,
	Editor,
	PageRecordType,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLAsset,
	TLAssetId,
	TLDefaultColorStyle,
	TLDefaultDashStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultTextAlignStyle,
	TLDrawShape,
	TLGeoShape,
	TLImageShape,
	TLNoteShape,
	TLPageId,
	TLShapeId,
	TLTextShape,
	TLVideoShape,
	Vec,
	VecModel,
	clamp,
	createShapeId,
	fetch,
	structuredClone,
	toRichText,
} from '@tldraw/editor'
import { getArrowBindings } from '../../shapes/arrow/shared'

const TLDRAW_V1_VERSION = 15.5

/** @internal */
export function buildFromV1Document(editor: Editor, _document: unknown) {
	let document = _document as TLV1Document
	editor.run(() => {
		document = migrate(document, TLDRAW_V1_VERSION)
		// Cancel any interactions / states
		editor.cancel().cancel().cancel().cancel()

		const firstPageId = editor.getPages()[0].id

		// Set the current page to the first page
		editor.setCurrentPage(firstPageId)

		// Delete all pages except first page
		for (const page of editor.getPages().slice(1)) {
			editor.deletePage(page.id)
		}

		// Delete all of the shapes on the current page
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		// Create assets
		const v1AssetIdsToV2AssetIds = new Map<string, TLAssetId>()

		Object.values(document.assets ?? {}).forEach((v1Asset) => {
			switch (v1Asset.type) {
				case TLV1AssetType.Image: {
					const assetId: TLAssetId = AssetRecordType.createId()
					v1AssetIdsToV2AssetIds.set(v1Asset.id, assetId)
					const placeholderAsset: TLAsset = {
						id: assetId,
						typeName: 'asset',
						type: 'image',
						props: {
							w: coerceDimension(v1Asset.size[0]),
							h: coerceDimension(v1Asset.size[1]),
							name: v1Asset.fileName ?? 'Untitled',
							isAnimated: false,
							mimeType: null,
							src: v1Asset.src,
						},
						meta: {},
					}
					editor.createAssets([placeholderAsset])
					tryMigrateAsset(editor, placeholderAsset)
					break
				}
				case TLV1AssetType.Video:
					{
						const assetId: TLAssetId = AssetRecordType.createId()
						v1AssetIdsToV2AssetIds.set(v1Asset.id, assetId)
						editor.createAssets([
							{
								id: assetId,
								typeName: 'asset',
								type: 'video',
								props: {
									w: coerceDimension(v1Asset.size[0]),
									h: coerceDimension(v1Asset.size[1]),
									name: v1Asset.fileName ?? 'Untitled',
									isAnimated: true,
									mimeType: null,
									src: v1Asset.src,
								},
								meta: {},
							},
						])
					}
					break
			}
		})

		// Create pages

		const v1PageIdsToV2PageIds = new Map<string, TLPageId>()

		Object.values(document.pages ?? {})
			.sort((a, b) => ((a.childIndex ?? 1) < (b.childIndex ?? 1) ? -1 : 1))
			.forEach((v1Page, i) => {
				if (i === 0) {
					v1PageIdsToV2PageIds.set(v1Page.id, editor.getCurrentPageId())
				} else {
					const pageId = PageRecordType.createId()
					v1PageIdsToV2PageIds.set(v1Page.id, pageId)
					editor.createPage({ name: v1Page.name ?? 'Page', id: pageId })
				}
			})

		Object.values(document.pages ?? {})
			.sort((a, b) => ((a.childIndex ?? 1) < (b.childIndex ?? 1) ? -1 : 1))
			.forEach((v1Page) => {
				// Set the current page id to the current page
				editor.setCurrentPage(v1PageIdsToV2PageIds.get(v1Page.id)!)

				const v1ShapeIdsToV2ShapeIds = new Map<string, TLShapeId>()
				const v1GroupShapeIdsToV1ChildIds = new Map<string, string[]>()

				const v1Shapes = Object.values(v1Page.shapes ?? {})
					.sort((a, b) => (a.childIndex < b.childIndex ? -1 : 1))
					.slice(0, editor.options.maxShapesPerPage)

				// Groups only
				v1Shapes.forEach((v1Shape) => {
					if (v1Shape.type !== TLV1ShapeType.Group) return

					const shapeId = createShapeId()
					v1ShapeIdsToV2ShapeIds.set(v1Shape.id, shapeId)
					v1GroupShapeIdsToV1ChildIds.set(v1Shape.id, [])
				})

				function decideNotToCreateShape(v1Shape: TLV1Shape) {
					v1ShapeIdsToV2ShapeIds.delete(v1Shape.id)
					const v1GroupParent = v1GroupShapeIdsToV1ChildIds.has(v1Shape.parentId)
					if (v1GroupParent) {
						const ids = v1GroupShapeIdsToV1ChildIds
							.get(v1Shape.parentId)!
							.filter((id) => id !== v1Shape.id)
						v1GroupShapeIdsToV1ChildIds.set(v1Shape.parentId, ids)
					}
				}

				// Non-groups only
				v1Shapes.forEach((v1Shape) => {
					// Skip groups for now, we'll create groups via the app's API
					if (v1Shape.type === TLV1ShapeType.Group) {
						return
					}

					const shapeId = createShapeId()
					v1ShapeIdsToV2ShapeIds.set(v1Shape.id, shapeId)

					if (v1Shape.parentId !== v1Page.id) {
						// If the parent is a group, then add the shape to the group's children
						if (v1GroupShapeIdsToV1ChildIds.has(v1Shape.parentId)) {
							v1GroupShapeIdsToV1ChildIds.get(v1Shape.parentId)!.push(v1Shape.id)
						} else {
							console.warn('parent does not exist', v1Shape)
						}
					}

					// First, try to find the shape's parent among the existing groups
					const parentId = v1PageIdsToV2PageIds.get(v1Page.id)!

					const inCommon = {
						id: shapeId,
						parentId,
						x: coerceNumber(v1Shape.point[0]),
						y: coerceNumber(v1Shape.point[1]),
						rotation: 0,
						isLocked: !!v1Shape.isLocked,
					}

					switch (v1Shape.type) {
						case TLV1ShapeType.Sticky: {
							editor.createShapes<TLNoteShape>([
								{
									...inCommon,
									type: 'note',
									props: {
										richText: toRichText(v1Shape.text ?? ''),
										color: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										align: getV2Align(v1Shape.style.textAlign),
									},
								},
							])
							break
						}
						case TLV1ShapeType.Rectangle: {
							editor.createShapes<TLGeoShape>([
								{
									...inCommon,
									type: 'geo',
									props: {
										geo: 'rectangle',
										w: coerceDimension(v1Shape.size[0]),
										h: coerceDimension(v1Shape.size[1]),
										richText: toRichText(v1Shape.label ?? ''),
										fill: getV2Fill(v1Shape.style.isFilled, v1Shape.style.color),
										labelColor: getV2Color(v1Shape.style.color),
										color: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										dash: getV2Dash(v1Shape.style.dash),
										align: 'middle',
									},
								},
							])

							const pageBoundsBeforeLabel = editor.getShapePageBounds(inCommon.id)!

							editor.updateShapes<TLGeoShape>([
								{
									id: inCommon.id,
									type: 'geo',
									props: {
										richText: toRichText(v1Shape.label ?? ''),
									},
								},
							])

							if (pageBoundsBeforeLabel.width === pageBoundsBeforeLabel.height) {
								const shape = editor.getShape<TLGeoShape>(inCommon.id)!
								const { growY } = shape.props
								const w = coerceDimension(shape.props.w)
								const h = coerceDimension(shape.props.h)
								const newW = w + growY / 2
								const newH = h + growY / 2

								editor.updateShapes([
									{
										id: inCommon.id,
										type: 'geo',
										x: coerceNumber(shape.x) - (newW - w) / 2,
										y: coerceNumber(shape.y) - (newH - h) / 2,
										props: {
											w: newW,
											h: newH,
										},
									},
								])
							}
							break
						}
						case TLV1ShapeType.Triangle: {
							editor.createShapes<TLGeoShape>([
								{
									...inCommon,
									type: 'geo',
									props: {
										geo: 'triangle',
										w: coerceDimension(v1Shape.size[0]),
										h: coerceDimension(v1Shape.size[1]),
										fill: getV2Fill(v1Shape.style.isFilled, v1Shape.style.color),
										labelColor: getV2Color(v1Shape.style.color),
										color: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										dash: getV2Dash(v1Shape.style.dash),
										align: 'middle',
									},
								},
							])

							const pageBoundsBeforeLabel = editor.getShapePageBounds(inCommon.id)!

							editor.updateShapes<TLGeoShape>([
								{
									id: inCommon.id,
									type: 'geo',
									props: {
										richText: toRichText(v1Shape.label ?? ''),
									},
								},
							])

							if (pageBoundsBeforeLabel.width === pageBoundsBeforeLabel.height) {
								const shape = editor.getShape<TLGeoShape>(inCommon.id)!
								const { growY } = shape.props
								const w = coerceDimension(shape.props.w)
								const h = coerceDimension(shape.props.h)
								const newW = w + growY / 2
								const newH = h + growY / 2

								editor.updateShapes([
									{
										id: inCommon.id,
										type: 'geo',
										x: coerceNumber(shape.x) - (newW - w) / 2,
										y: coerceNumber(shape.y) - (newH - h) / 2,
										props: {
											w: newW,
											h: newH,
										},
									},
								])
							}
							break
						}
						case TLV1ShapeType.Ellipse: {
							editor.createShapes<TLGeoShape>([
								{
									...inCommon,
									type: 'geo',
									props: {
										geo: 'ellipse',
										w: coerceDimension(v1Shape.radius[0]) * 2,
										h: coerceDimension(v1Shape.radius[1]) * 2,
										fill: getV2Fill(v1Shape.style.isFilled, v1Shape.style.color),
										labelColor: getV2Color(v1Shape.style.color),
										color: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										dash: getV2Dash(v1Shape.style.dash),
										align: 'middle',
									},
								},
							])

							const pageBoundsBeforeLabel = editor.getShapePageBounds(inCommon.id)!

							editor.updateShapes<TLGeoShape>([
								{
									id: inCommon.id,
									type: 'geo',
									props: {
										richText: toRichText(v1Shape.label ?? ''),
									},
								},
							])

							if (pageBoundsBeforeLabel.width === pageBoundsBeforeLabel.height) {
								const shape = editor.getShape<TLGeoShape>(inCommon.id)!
								const { growY } = shape.props
								const w = coerceDimension(shape.props.w)
								const h = coerceDimension(shape.props.h)
								const newW = w + growY / 2
								const newH = h + growY / 2

								editor.updateShapes([
									{
										id: inCommon.id,
										type: 'geo',
										x: coerceNumber(shape.x) - (newW - w) / 2,
										y: coerceNumber(shape.y) - (newH - h) / 2,
										props: {
											w: newW,
											h: newH,
										},
									},
								])
							}

							break
						}
						case TLV1ShapeType.Draw: {
							if (v1Shape.points.length === 0) {
								decideNotToCreateShape(v1Shape)
								break
							}

							editor.createShapes<TLDrawShape>([
								{
									...inCommon,
									type: 'draw',
									props: {
										fill: getV2Fill(v1Shape.style.isFilled, v1Shape.style.color),
										color: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										dash: getV2Dash(v1Shape.style.dash),
										isPen: false,
										isComplete: v1Shape.isComplete,
										segments: [{ type: 'free', points: v1Shape.points.map(getV2Point) }],
									},
								},
							])
							break
						}
						case TLV1ShapeType.Arrow: {
							const v1Bend = coerceNumber(v1Shape.bend)
							const v1Start = getV2Point(v1Shape.handles.start.point)
							const v1End = getV2Point(v1Shape.handles.end.point)
							const dist = Vec.Dist(v1Start, v1End)
							const v2Bend = (dist * -v1Bend) / 2

							// Could also be a line... but we'll use it as an arrow anyway
							editor.createShapes<TLArrowShape>([
								{
									...inCommon,
									type: 'arrow',
									props: {
										richText: toRichText(v1Shape.label ?? ''),
										color: getV2Color(v1Shape.style.color),
										labelColor: getV2Color(v1Shape.style.color),
										size: getV2Size(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										dash: getV2Dash(v1Shape.style.dash),
										arrowheadStart: getV2Arrowhead(v1Shape.decorations?.start),
										arrowheadEnd: getV2Arrowhead(v1Shape.decorations?.end),
										start: {
											x: coerceNumber(v1Shape.handles.start.point[0]),
											y: coerceNumber(v1Shape.handles.start.point[1]),
										},
										end: {
											x: coerceNumber(v1Shape.handles.end.point[0]),
											y: coerceNumber(v1Shape.handles.end.point[1]),
										},
										bend: v2Bend,
									},
								},
							])

							break
						}
						case TLV1ShapeType.Text: {
							editor.createShapes<TLTextShape>([
								{
									...inCommon,
									type: 'text',
									props: {
										richText: toRichText(v1Shape.text ?? ' '),
										color: getV2Color(v1Shape.style.color),
										size: getV2TextSize(v1Shape.style.size),
										font: getV2Font(v1Shape.style.font),
										textAlign: getV2TextAlign(v1Shape.style.textAlign),
										scale: v1Shape.style.scale ?? 1,
									},
								},
							])
							break
						}
						case TLV1ShapeType.Image: {
							const assetId = v1AssetIdsToV2AssetIds.get(v1Shape.assetId)

							if (!assetId) {
								console.warn('Could not find asset id', v1Shape.assetId)
								return
							}

							editor.createShapes<TLImageShape>([
								{
									...inCommon,
									type: 'image',
									props: {
										w: coerceDimension(v1Shape.size[0]),
										h: coerceDimension(v1Shape.size[1]),
										assetId,
									},
								},
							])
							break
						}
						case TLV1ShapeType.Video: {
							const assetId = v1AssetIdsToV2AssetIds.get(v1Shape.assetId)

							if (!assetId) {
								console.warn('Could not find asset id', v1Shape.assetId)
								return
							}

							editor.createShapes<TLVideoShape>([
								{
									...inCommon,
									type: 'video',
									props: {
										w: coerceDimension(v1Shape.size[0]),
										h: coerceDimension(v1Shape.size[1]),
										assetId,
									},
								},
							])
							break
						}
					}

					const rotation = coerceNumber(v1Shape.rotation)

					if (rotation !== 0) {
						editor.select(shapeId)
						editor.rotateShapesBy([shapeId], rotation)
					}
				})

				// Create groups
				v1GroupShapeIdsToV1ChildIds.forEach((v1ChildIds, v1GroupId) => {
					const v2ChildShapeIds = v1ChildIds.map((id) => v1ShapeIdsToV2ShapeIds.get(id)!)
					const v2GroupId = v1ShapeIdsToV2ShapeIds.get(v1GroupId)!
					editor.groupShapes(v2ChildShapeIds, { groupId: v2GroupId })

					const v1Group = v1Page.shapes[v1GroupId]
					const rotation = coerceNumber(v1Group.rotation)

					if (rotation !== 0) {
						editor.select(v2GroupId)
						editor.rotateShapesBy([v2GroupId], rotation)
					}
				})

				// Bind arrows to shapes

				v1Shapes.forEach((v1Shape) => {
					if (v1Shape.type !== TLV1ShapeType.Arrow) {
						return
					}

					const v2ShapeId = v1ShapeIdsToV2ShapeIds.get(v1Shape.id)!
					const util = editor.getShapeUtil<TLArrowShape>('arrow')

					// dumb but necessary
					editor.inputs.ctrlKey = false

					for (const handleId of ['start', 'end'] as const) {
						const bindingId = v1Shape.handles[handleId].bindingId
						if (bindingId) {
							const binding = v1Page.bindings[bindingId]
							if (!binding) {
								// arrow has a reference to a binding that no longer exists
								continue
							}

							const targetId = v1ShapeIdsToV2ShapeIds.get(binding.toId)!

							const targetShape = editor.getShape(targetId)!

							// (unexpected) We didn't create the target shape
							if (!targetShape) continue

							if (targetId) {
								const bounds = editor.getShapePageBounds(targetId)!

								const v2ShapeFresh = editor.getShape<TLArrowShape>(v2ShapeId)!

								const nx = clamp((coerceNumber(binding.point[0]) + 0.5) / 2, 0.2, 0.8)
								const ny = clamp((coerceNumber(binding.point[1]) + 0.5) / 2, 0.2, 0.8)

								const point = editor.getPointInShapeSpace(v2ShapeFresh, {
									x: bounds.minX + bounds.width * nx,
									y: bounds.minY + bounds.height * ny,
								})

								const handles = editor.getShapeHandles(v2ShapeFresh)!
								const change = util.onHandleDrag!(v2ShapeFresh, {
									handle: {
										...handles.find((h) => h.id === handleId)!,
										x: point.x,
										y: point.y,
									},
									isPrecise: point.x !== 0.5 || point.y !== 0.5,
									isCreatingShape: true,
								})

								if (change) {
									editor.updateShape(change)
								}

								const freshBinding = getArrowBindings(
									editor,
									editor.getShape<TLArrowShape>(v2ShapeId)!
								)[handleId]
								if (freshBinding) {
									const updatedFreshBinding = structuredClone(freshBinding)
									if (binding.distance === 0) {
										updatedFreshBinding.props.isExact = true
									}
									if (updatedFreshBinding.toId !== targetId) {
										updatedFreshBinding.toId = targetId
										updatedFreshBinding.props.normalizedAnchor = { x: nx, y: ny }
									}

									editor.updateBinding(updatedFreshBinding)
								}
							}
						}
					}
				})
			})

		// Set the current page to the first page again
		editor.setCurrentPage(firstPageId)

		editor.clearHistory()
		editor.selectNone()

		const bounds = editor.getCurrentPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { targetZoom: 1 })
		}
	})
}

function coerceNumber(n: unknown): number {
	if (typeof n !== 'number') return 0
	if (Number.isNaN(n)) return 0
	if (!Number.isFinite(n)) return 0
	return n
}

function coerceDimension(d: unknown): number {
	const n = coerceNumber(d)
	if (n <= 0) return 1
	return n
}

/**
 * We want to move assets over to our new S3 bucket & extract any relevant metadata. That process is
 * async though, where the rest of our migration is synchronous.
 *
 * We'll write placeholder assets to the app using the old asset URLs, then kick off a process async
 * to try and download the real assets, extract the metadata, and upload them to our new bucket.
 * It's not a big deal if this fails though.
 */
async function tryMigrateAsset(editor: Editor, placeholderAsset: TLAsset) {
	try {
		if (placeholderAsset.type === 'bookmark' || !placeholderAsset.props.src) return

		const response = await fetch(placeholderAsset.props.src)
		if (!response.ok) return

		const file = new File([await response.blob()], placeholderAsset.props.name, {
			type: response.headers.get('content-type') ?? placeholderAsset.props.mimeType ?? undefined,
		})

		const newAsset = await editor.getAssetForExternalContent({ type: 'file', file })
		if (!newAsset) throw new Error('Could not get asset for external content')
		if (newAsset.type === 'bookmark') return

		editor.updateAssets([
			{
				id: placeholderAsset.id,
				type: placeholderAsset.type,
				props: {
					...newAsset.props,
					name: placeholderAsset.props.name,
				},
			},
		])
	} catch {
		// not a big deal, we'll just keep the placeholder asset
	}
}

function migrate(document: TLV1Document, newVersion: number): TLV1Document {
	const { version = 0 } = document

	if (!document.assets) {
		document.assets = {}
	}

	// Remove unused assets when loading a document
	const assetIdsInUse = new Set<string>()

	Object.values(document.pages).forEach((page) =>
		Object.values(page.shapes).forEach((shape) => {
			const { parentId, children, assetId } = shape

			if (assetId) {
				assetIdsInUse.add(assetId)
			}

			// Fix missing parent bug
			if (parentId !== page.id && !page.shapes[parentId]) {
				console.warn('Encountered a shape with a missing parent!')
				shape.parentId = page.id
			}

			if (shape.type === TLV1ShapeType.Group && children) {
				children.forEach((childId) => {
					if (!page.shapes[childId]) {
						console.warn('Encountered a parent with a missing child!', shape.id, childId)
						children?.splice(children.indexOf(childId), 1)
					}
				})

				// TODO: Remove the shape if it has no children
			}
		})
	)

	Object.keys(document.assets).forEach((assetId) => {
		if (!assetIdsInUse.has(assetId)) {
			delete document.assets[assetId]
		}
	})

	if (version !== newVersion) {
		if (version < 14) {
			Object.values(document.pages).forEach((page) => {
				Object.values(page.shapes)
					.filter((shape) => shape.type === TLV1ShapeType.Text)
					.forEach((shape) => {
						if ((shape as TLV1TextShape).style.font === undefined) {
							;(shape as TLV1TextShape).style.font = TLV1FontStyle.Script
						}
					})
			})
		}

		// Lowercase styles, move binding meta to binding
		if (version <= 13) {
			Object.values(document.pages).forEach((page) => {
				Object.values(page.bindings).forEach((binding) => {
					Object.assign(binding, (binding as any).meta)
				})

				Object.values(page.shapes).forEach((shape) => {
					Object.entries(shape.style).forEach(([id, style]) => {
						if (typeof style === 'string') {
							// @ts-ignore
							shape.style[id] = style.toLowerCase()
						}
					})

					if (shape.type === TLV1ShapeType.Arrow) {
						if (shape.decorations) {
							Object.entries(shape.decorations).forEach(([id, decoration]) => {
								if ((decoration as unknown) === 'Arrow') {
									shape.decorations = {
										...shape.decorations,
										[id]: TLV1Decoration.Arrow,
									}
								}
							})
						}
					}
				})
			})
		}

		// Add document name and file system handle
		if (version <= 13.1 && document.name == null) {
			document.name = 'New Document'
		}

		if (version < 15 && document.assets == null) {
			document.assets = {}
		}

		Object.values(document.pages).forEach((page) => {
			Object.values(page.shapes).forEach((shape) => {
				if (version < 15.2) {
					if (
						(shape.type === TLV1ShapeType.Image || shape.type === TLV1ShapeType.Video) &&
						shape.style.isFilled == null
					) {
						shape.style.isFilled = true
					}
				}

				if (version < 15.3) {
					if (
						shape.type === TLV1ShapeType.Rectangle ||
						shape.type === TLV1ShapeType.Triangle ||
						shape.type === TLV1ShapeType.Ellipse ||
						shape.type === TLV1ShapeType.Arrow
					) {
						if ('text' in shape && typeof shape.text === 'string') {
							shape.label = shape.text
						}
						if (!shape.label) {
							shape.label = ''
						}
						if (!shape.labelPoint) {
							shape.labelPoint = [0.5, 0.5]
						}
					}
				}
			})
		})
	}

	// Cleanup
	Object.values(document.pageStates).forEach((pageState) => {
		pageState.selectedIds = pageState.selectedIds.filter((id) => {
			return document.pages[pageState.id].shapes[id] !== undefined
		})
		pageState.bindingId = undefined
		pageState.editingId = undefined
		pageState.hoveredId = undefined
		pageState.pointedId = undefined
	})

	document.version = newVersion

	return document
}

/* -------------------- TLV1 Types -------------------- */

/** @internal */
export interface TLV1Handle {
	id: string
	index: number
	point: number[]
	canBind?: boolean
	bindingId?: string
}

/** @internal */
export interface TLV1BaseBinding {
	id: string
	toId: string
	fromId: string
}

/** @internal */
export enum TLV1ShapeType {
	Sticky = 'sticky',
	Ellipse = 'ellipse',
	Rectangle = 'rectangle',
	Triangle = 'triangle',
	Draw = 'draw',
	Arrow = 'arrow',
	Text = 'text',
	Group = 'group',
	Image = 'image',
	Video = 'video',
}

/** @internal */
export enum TLV1ColorStyle {
	White = 'white',
	LightGray = 'lightGray',
	Gray = 'gray',
	Black = 'black',
	Green = 'green',
	Cyan = 'cyan',
	Blue = 'blue',
	Indigo = 'indigo',
	Violet = 'violet',
	Red = 'red',
	Orange = 'orange',
	Yellow = 'yellow',
}

/** @internal */
export enum TLV1SizeStyle {
	Small = 'small',
	Medium = 'medium',
	Large = 'large',
}

/** @internal */
export enum TLV1DashStyle {
	Draw = 'draw',
	Solid = 'solid',
	Dashed = 'dashed',
	Dotted = 'dotted',
}

/** @internal */
export enum TLV1AlignStyle {
	Start = 'start',
	Middle = 'middle',
	End = 'end',
	Justify = 'justify',
}

/** @internal */
export enum TLV1FontStyle {
	Script = 'script',
	Sans = 'sans',
	Serif = 'serif',
	Mono = 'mono',
}

/** @internal */
export interface TLV1ShapeStyles {
	color: TLV1ColorStyle
	size: TLV1SizeStyle
	dash: TLV1DashStyle
	font?: TLV1FontStyle
	textAlign?: TLV1AlignStyle
	isFilled?: boolean
	scale?: number
}

/** @internal */
export interface TLV1BaseShape {
	id: string
	parentId: string
	childIndex: number
	name: string
	point: number[]
	assetId?: string
	rotation?: number
	children?: string[]
	isGhost?: boolean
	isHidden?: boolean
	isLocked?: boolean
	isGenerated?: boolean
	isAspectRatioLocked?: boolean
	style: TLV1ShapeStyles
	type: TLV1ShapeType
	label?: string
	handles?: Record<string, TLV1Handle>
}

/** @internal */
export interface TLV1DrawShape extends TLV1BaseShape {
	type: TLV1ShapeType.Draw
	points: number[][]
	isComplete: boolean
}

/** @internal */
export interface TLV1RectangleShape extends TLV1BaseShape {
	type: TLV1ShapeType.Rectangle
	size: number[]
	label?: string
	labelPoint?: number[]
}

/** @internal */
export interface TLV1EllipseShape extends TLV1BaseShape {
	type: TLV1ShapeType.Ellipse
	radius: number[]
	label?: string
	labelPoint?: number[]
}

/** @internal */
export interface TLV1TriangleShape extends TLV1BaseShape {
	type: TLV1ShapeType.Triangle
	size: number[]
	label?: string
	labelPoint?: number[]
}

/** @internal */
export enum TLV1Decoration {
	Arrow = 'arrow',
}

// The shape created with the arrow tool
/** @internal */
export interface TLV1ArrowShape extends TLV1BaseShape {
	type: TLV1ShapeType.Arrow
	bend: number
	handles: {
		start: TLV1Handle
		bend: TLV1Handle
		end: TLV1Handle
	}
	decorations?: {
		start?: TLV1Decoration
		end?: TLV1Decoration
		middle?: TLV1Decoration
	}
	label?: string
	labelPoint?: number[]
}

/** @internal */
export interface TLV1ArrowBinding extends TLV1BaseBinding {
	handleId: keyof TLV1ArrowShape['handles']
	distance: number
	point: number[]
}

/** @internal */
export type TLV1Binding = TLV1ArrowBinding

/** @internal */
export interface TLV1ImageShape extends TLV1BaseShape {
	type: TLV1ShapeType.Image
	size: number[]
	assetId: string
}

/** @internal */
export interface TLV1VideoShape extends TLV1BaseShape {
	type: TLV1ShapeType.Video
	size: number[]
	assetId: string
	isPlaying: boolean
	currentTime: number
}

// The shape created by the text tool
/** @internal */
export interface TLV1TextShape extends TLV1BaseShape {
	type: TLV1ShapeType.Text
	text: string
}

// The shape created by the sticky tool
/** @internal */
export interface TLV1StickyShape extends TLV1BaseShape {
	type: TLV1ShapeType.Sticky
	size: number[]
	text: string
}

// The shape created when multiple shapes are grouped
/** @internal */
export interface TLV1GroupShape extends TLV1BaseShape {
	type: TLV1ShapeType.Group
	size: number[]
	children: string[]
}

/** @internal */
export type TLV1Shape =
	| TLV1RectangleShape
	| TLV1EllipseShape
	| TLV1TriangleShape
	| TLV1DrawShape
	| TLV1ArrowShape
	| TLV1TextShape
	| TLV1GroupShape
	| TLV1StickyShape
	| TLV1ImageShape
	| TLV1VideoShape

/** @internal */
export interface TLV1Page {
	id: string
	name?: string
	childIndex?: number
	shapes: Record<string, TLV1Shape>
	bindings: Record<string, TLV1Binding>
}

/** @internal */
export interface TLV1Bounds {
	minX: number
	minY: number
	maxX: number
	maxY: number
	width: number
	height: number
	rotation?: number
}

/** @internal */
export interface TLV1PageState {
	id: string
	selectedIds: string[]
	camera: {
		point: number[]
		zoom: number
	}
	brush?: TLV1Bounds | null
	pointedId?: string | null
	hoveredId?: string | null
	editingId?: string | null
	bindingId?: string | null
}

/** @internal */
export enum TLV1AssetType {
	Image = 'image',
	Video = 'video',
}

/** @internal */
export interface TLV1ImageAsset extends TLV1BaseAsset {
	type: TLV1AssetType.Image
	fileName: string
	src: string
	size: number[]
}

/** @internal */
export interface TLV1VideoAsset extends TLV1BaseAsset {
	type: TLV1AssetType.Video
	fileName: string
	src: string
	size: number[]
}

/** @internal */
export interface TLV1BaseAsset {
	id: string
	type: string
}

/** @internal */
export type TLV1Asset = TLV1ImageAsset | TLV1VideoAsset

/** @internal */
export interface TLV1Document {
	id: string
	name: string
	version: number
	pages: Record<string, TLV1Page>
	pageStates: Record<string, TLV1PageState>
	assets: Record<string, TLV1Asset>
}

/* ------------------ Translations ------------------ */

const v1ColorsToV2Colors: Record<TLV1ColorStyle, TLDefaultColorStyle> = {
	[TLV1ColorStyle.White]: 'black',
	[TLV1ColorStyle.Black]: 'black',
	[TLV1ColorStyle.LightGray]: 'grey',
	[TLV1ColorStyle.Gray]: 'grey',
	[TLV1ColorStyle.Green]: 'light-green',
	[TLV1ColorStyle.Cyan]: 'green',
	[TLV1ColorStyle.Blue]: 'light-blue',
	[TLV1ColorStyle.Indigo]: 'blue',
	[TLV1ColorStyle.Orange]: 'orange',
	[TLV1ColorStyle.Yellow]: 'yellow',
	[TLV1ColorStyle.Red]: 'red',
	[TLV1ColorStyle.Violet]: 'light-violet',
}

const v1FontsToV2Fonts: Record<TLV1FontStyle, TLDefaultFontStyle> = {
	[TLV1FontStyle.Mono]: 'mono',
	[TLV1FontStyle.Sans]: 'sans',
	[TLV1FontStyle.Script]: 'draw',
	[TLV1FontStyle.Serif]: 'serif',
}

const v1AlignsToV2Aligns: Record<TLV1AlignStyle, TLDefaultHorizontalAlignStyle> = {
	[TLV1AlignStyle.Start]: 'start',
	[TLV1AlignStyle.Middle]: 'middle',
	[TLV1AlignStyle.End]: 'end',
	[TLV1AlignStyle.Justify]: 'start',
}

const v1TextAlignsToV2TextAligns: Record<TLV1AlignStyle, TLDefaultTextAlignStyle> = {
	[TLV1AlignStyle.Start]: 'start',
	[TLV1AlignStyle.Middle]: 'middle',
	[TLV1AlignStyle.End]: 'end',
	[TLV1AlignStyle.Justify]: 'start',
}

const v1TextSizesToV2TextSizes: Record<TLV1SizeStyle, TLDefaultSizeStyle> = {
	[TLV1SizeStyle.Small]: 's',
	[TLV1SizeStyle.Medium]: 'l',
	[TLV1SizeStyle.Large]: 'xl',
}

const v1SizesToV2Sizes: Record<TLV1SizeStyle, TLDefaultSizeStyle> = {
	[TLV1SizeStyle.Small]: 'm',
	[TLV1SizeStyle.Medium]: 'l',
	[TLV1SizeStyle.Large]: 'xl',
}

const v1DashesToV2Dashes: Record<TLV1DashStyle, TLDefaultDashStyle> = {
	[TLV1DashStyle.Solid]: 'solid',
	[TLV1DashStyle.Dashed]: 'dashed',
	[TLV1DashStyle.Dotted]: 'dotted',
	[TLV1DashStyle.Draw]: 'draw',
}

function getV2Color(color: TLV1ColorStyle | undefined): TLDefaultColorStyle {
	return color ? (v1ColorsToV2Colors[color] ?? 'black') : 'black'
}

function getV2Font(font: TLV1FontStyle | undefined): TLDefaultFontStyle {
	return font ? (v1FontsToV2Fonts[font] ?? 'draw') : 'draw'
}

function getV2Align(align: TLV1AlignStyle | undefined): TLDefaultHorizontalAlignStyle {
	return align ? (v1AlignsToV2Aligns[align] ?? 'middle') : 'middle'
}

function getV2TextAlign(align: TLV1AlignStyle | undefined): TLDefaultTextAlignStyle {
	return align ? (v1TextAlignsToV2TextAligns[align] ?? 'middle') : 'middle'
}

function getV2TextSize(size: TLV1SizeStyle | undefined): TLDefaultSizeStyle {
	return size ? (v1TextSizesToV2TextSizes[size] ?? 'm') : 'm'
}

function getV2Size(size: TLV1SizeStyle | undefined): TLDefaultSizeStyle {
	return size ? (v1SizesToV2Sizes[size] ?? 'l') : 'l'
}

function getV2Dash(dash: TLV1DashStyle | undefined): TLDefaultDashStyle {
	return dash ? (v1DashesToV2Dashes[dash] ?? 'draw') : 'draw'
}

function getV2Point(point: number[]): VecModel {
	return {
		x: coerceNumber(point[0]),
		y: coerceNumber(point[1]),
		z: point[2] == null ? 0.5 : coerceNumber(point[2]),
	}
}

function getV2Arrowhead(decoration: TLV1Decoration | undefined): TLArrowShapeArrowheadStyle {
	return decoration === TLV1Decoration.Arrow ? 'arrow' : 'none'
}

function getV2Fill(isFilled: boolean | undefined, color: TLV1ColorStyle) {
	return isFilled
		? color === TLV1ColorStyle.Black || color === TLV1ColorStyle.White
			? 'semi'
			: 'solid'
		: 'none'
}
