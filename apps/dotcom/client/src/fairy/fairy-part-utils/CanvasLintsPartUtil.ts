import { AgentRequest, CanvasLintsPart, FairyCanvasLint } from '@tldraw/fairy-shared'
import {
	Box,
	Editor,
	TLArrowShape,
	TLShape,
	getArrowBindings,
	intersectPolygonPolygon,
	linesIntersect,
	pointInPolygon,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class CanvasLintsPartUtil extends PromptPartUtil<CanvasLintsPart> {
	static override type = 'canvasLints' as const

	override getPart(request: AgentRequest): CanvasLintsPart {
		const { editor } = this
		if (!editor) return { type: 'canvasLints', lints: [] }

		// Get all shapes within the agent's viewport
		const shapes = editor.getCurrentPageShapesSorted()
		const contextBoundsBox = Box.From(request.bounds)
		const shapesInBounds = shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return contextBoundsBox.includes(bounds)
		})
		const lints = detectCanvasLints(shapesInBounds, this.editor)

		return {
			type: 'canvasLints',
			lints,
		}
	}
}

function detectCanvasLints(shapesInRequestBounds: TLShape[], editor: Editor): FairyCanvasLint[] {
	const lints: FairyCanvasLint[] = []
	lints.push(...getGrowYOnShapeLints(shapesInRequestBounds, editor))
	lints.push(...getOverlappingTextLints(shapesInRequestBounds, editor))
	lints.push(...getFriendlessArrowsLints(shapesInRequestBounds, editor))
	return lints
}

function getGrowYOnShapeLints(
	shapesInRequestBounds: TLShape[],
	_editor: Editor
): FairyCanvasLint[] {
	const lints: FairyCanvasLint[] = []
	const shapesWithGrowY = shapesInRequestBounds.filter((shape) => {
		if ('growY' in shape.props) {
			return shape.props.growY > 0
		}
		return false
	})

	shapesWithGrowY.forEach((shape) => {
		lints.push({
			type: 'growY-on-shape',
			shapeIds: [shape.id],
		})
	})
	return lints
}

function getOverlappingTextLints(
	shapesInRequestBounds: TLShape[],
	editor: Editor
): FairyCanvasLint[] {
	const lints: FairyCanvasLint[] = []
	const shapesWithText = shapesInRequestBounds.filter((shape) => {
		const util = editor.getShapeUtil(shape)
		const text = util.getText(shape)
		return text !== undefined && text.length > 0 // don't trim bc there might be newlines which actually changes the size of the text
	})

	if (shapesWithText.length < 2) {
		return lints
	}

	// Use union-find to group overlapping shapes
	const parent = new Map<TLShape, TLShape>()

	function find(shape: TLShape): TLShape {
		if (!parent.has(shape)) {
			parent.set(shape, shape)
		}
		const p = parent.get(shape)!
		if (p !== shape) {
			parent.set(shape, find(p))
		}
		return parent.get(shape)!
	}

	function union(shapeA: TLShape, shapeB: TLShape) {
		const rootA = find(shapeA)
		const rootB = find(shapeB)
		if (rootA !== rootB) {
			parent.set(rootB, rootA)
		}
	}

	// Check all pairs for overlaps using geometry-based detection
	for (let i = 0; i < shapesWithText.length; i++) {
		const shapeA = shapesWithText[i]
		for (let j = i + 1; j < shapesWithText.length; j++) {
			const shapeB = shapesWithText[j]
			if (shapesOverlap(editor, shapeA, shapeB)) {
				union(shapeA, shapeB)
			}
		}
	}

	// Group shapes by their root
	const groups = new Map<TLShape, TLShape[]>()
	for (const shape of shapesWithText) {
		const root = find(shape)
		if (!groups.has(root)) {
			groups.set(root, [])
		}
		groups.get(root)!.push(shape)
	}

	// Create lint entries for groups with 2+ shapes (overlapping)
	for (const [, group] of groups) {
		if (group.length >= 2) {
			lints.push({
				type: 'overlapping-text',
				shapeIds: group.map((shape) => shape.id),
			})
		}
	}

	// Check if text shapes intersect the edge of geo shapes
	const textShapes = shapesInRequestBounds.filter((shape) => shape.type === 'text')
	const geoShapes = shapesInRequestBounds.filter((shape) => shape.type === 'geo')

	for (const textShape of textShapes) {
		for (const geoShape of geoShapes) {
			if (textShapeIntersectsGeoEdge(editor, textShape, geoShape)) {
				// Check if we already have a lint for these shapes
				const existingLint = lints.find(
					(lint) =>
						lint.type === 'overlapping-text' &&
						lint.shapeIds.includes(textShape.id) &&
						lint.shapeIds.includes(geoShape.id)
				)
				if (!existingLint) {
					lints.push({
						type: 'overlapping-text',
						shapeIds: [textShape.id, geoShape.id],
					})
				}
			}
		}
	}

	return lints
}

function getFriendlessArrowsLints(
	shapesInRequestBounds: TLShape[],
	editor: Editor
): FairyCanvasLint[] {
	const lints: FairyCanvasLint[] = []
	const arrowShapes = shapesInRequestBounds.filter(
		(shape) => shape.type === 'arrow'
	) as TLArrowShape[]

	const friendlessArrows = arrowShapes.filter((arrow) => {
		const bindings = getArrowBindings(editor, arrow)
		// An arrow is "friendless" if it has no start or end binding
		return !bindings.start || !bindings.end
	})

	friendlessArrows.forEach((arrow) => {
		lints.push({
			type: 'friendless-arrow',
			shapeIds: [arrow.id],
		})
	})

	return lints
}

function shapesOverlap(editor: Editor, shapeA: TLShape, shapeB: TLShape): boolean {
	// Quick bounds check first for early exit
	const boundsA = editor.getShapePageBounds(shapeA)
	const boundsB = editor.getShapePageBounds(shapeB)
	if (!boundsA || !boundsB || !Box.Collides(boundsA, boundsB)) {
		return false
	}

	// Get geometry and transform for shape A
	const geometryA = editor.getShapeGeometry(shapeA)
	const pageTransformA = editor.getShapePageTransform(shapeA)
	const verticesA = pageTransformA.applyToPoints(geometryA.vertices)

	// Get clip path if it exists
	const shapeUtilA = editor.getShapeUtil(shapeA.type)
	const clipPathA = shapeUtilA.getClipPath?.(shapeA)
	const polygonA = clipPathA
		? intersectPolygonPolygon(pageTransformA.applyToPoints(clipPathA), verticesA)
		: verticesA

	if (!polygonA || polygonA.length === 0) {
		return false
	}

	// Transform polygon A into shape B's local space
	const pageTransformB = editor.getShapePageTransform(shapeB)
	const polygonAInShapeBSpace = pageTransformB.clone().invert().applyToPoints(polygonA)

	// Check if shape B's geometry overlaps with the transformed polygon
	const geometryB = editor.getShapeGeometry(shapeB)
	return geometryB.overlapsPolygon(polygonAInShapeBSpace)
}

function textShapeIntersectsGeoEdge(
	editor: Editor,
	textShape: TLShape,
	geoShape: TLShape
): boolean {
	// Quick bounds check first for early exit
	const textBounds = editor.getShapePageBounds(textShape)
	const geoBounds = editor.getShapePageBounds(geoShape)
	if (!textBounds || !geoBounds || !Box.Collides(textBounds, geoBounds)) {
		return false
	}

	// Get text shape geometry in page space
	const textGeometry = editor.getShapeGeometry(textShape)
	const textPageTransform = editor.getShapePageTransform(textShape)
	const textVertices = textPageTransform.applyToPoints(textGeometry.vertices)

	// Get clip path if it exists for text shape
	const textShapeUtil = editor.getShapeUtil(textShape.type)
	const textClipPath = textShapeUtil.getClipPath?.(textShape)
	const textPolygon = textClipPath
		? intersectPolygonPolygon(textPageTransform.applyToPoints(textClipPath), textVertices)
		: textVertices

	if (!textPolygon || textPolygon.length === 0) {
		return false
	}

	// Get geo shape geometry in page space
	const geoGeometry = editor.getShapeGeometry(geoShape)
	const geoPageTransform = editor.getShapePageTransform(geoShape)
	const geoVertices = geoPageTransform.applyToPoints(geoGeometry.vertices)

	// Get clip path if it exists for geo shape
	const geoShapeUtil = editor.getShapeUtil(geoShape.type)
	const geoClipPath = geoShapeUtil.getClipPath?.(geoShape)
	const geoPolygon = geoClipPath
		? intersectPolygonPolygon(geoPageTransform.applyToPoints(geoClipPath), geoVertices)
		: geoVertices

	if (!geoPolygon || geoPolygon.length === 0) {
		return false
	}

	// Check if text shape intersects the geo shape's edge
	// This means they intersect but the text shape is not fully contained inside
	const textIsClosed = textGeometry.isClosed
	const geoIsClosed = geoGeometry.isClosed

	// Geo shapes are typically closed, so handle that case first
	if (geoIsClosed) {
		// Check if text shape intersects the geo shape's boundary
		let edgesIntersect = false
		if (textIsClosed) {
			// Both are closed polygons - check if their edges intersect
			edgesIntersect = polygonsIntersect(textPolygon, geoPolygon)
		} else {
			// Text is open (polyline), geo is closed - check if text intersects geo's boundary
			edgesIntersect = polygonIntersectsPolyline(geoPolygon, textPolygon)
		}

		if (!edgesIntersect) {
			return false
		}

		// Check if text shape is NOT fully contained inside geo shape
		// If all vertices are inside, it's fully contained (not intersecting edge)
		const allVerticesInside = textPolygon.every((vertex) => pointInPolygon(vertex, geoPolygon))
		if (allVerticesInside) {
			return false // Fully contained, not intersecting edge
		}

		return true
	} else {
		// Geo shape is open (unlikely but handle it)
		// Check if any line segments intersect
		if (textIsClosed) {
			return polygonIntersectsPolyline(textPolygon, geoPolygon)
		} else {
			// Both are open - check if any segments intersect
			for (let i = 0; i < textPolygon.length - 1; i++) {
				for (let j = 0; j < geoPolygon.length - 1; j++) {
					if (
						linesIntersect(textPolygon[i], textPolygon[i + 1], geoPolygon[j], geoPolygon[j + 1])
					) {
						return true
					}
				}
			}
			return false
		}
	}
}
