import { TLAiContent } from '@tldraw/ai'
import { TLShape } from 'tldraw'
import { getSimpleContentFromCanvasContent } from './getSimpleContentFromCanvasContent'
import { ISimplePeripheralShape } from './schema'

export function getSimplePeripheralContentFromCanvasContent(
	wholePageShapes: TLShape[],
	viewportContent: TLAiContent
): {
	shapes: ISimplePeripheralShape[]
} {
	const simpleViewportContent = getSimpleContentFromCanvasContent(viewportContent)
	const simpleWholePageContent = getSimpleContentFromCanvasContent({
		shapes: wholePageShapes,
		bindings: [],
		assets: [],
	})

	const wholePageLessViewportContent = simpleWholePageContent.shapes.filter(
		(shape) => !simpleViewportContent.shapes.some((s) => s.shapeId === shape.shapeId)
	)

	const peripheralContentWithIds = wholePageLessViewportContent.map((shape) => {
		// Handle different shape types
		if (shape._type === 'line') {
			// For lines, use the bounding box
			const minX = Math.min(shape.x1, shape.x2)
			const maxX = Math.max(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			const maxY = Math.max(shape.y1, shape.y2)

			return {
				h: Math.round(maxY - minY),
				shapeId: shape.shapeId,
				w: Math.round(maxX - minX),
				x: Math.round(minX),
				y: Math.round(minY),
			}
		}

		if (shape._type === 'arrow') {
			// For arrows, use the bounding box
			const minX = Math.min(shape.x1, shape.x2)
			const maxX = Math.max(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			const maxY = Math.max(shape.y1, shape.y2)

			return {
				h: Math.round(maxY - minY),
				shapeId: shape.shapeId,
				w: Math.round(maxX - minX),
				x: Math.round(minX),
				y: Math.round(minY),
			}
		}

		if (shape._type === 'note' || shape._type === 'text' || shape._type === 'unknown') {
			// For shapes without dimensions, use default size
			return {
				h: 100, // default height
				shapeId: shape.shapeId,
				w: 100, // default width
				x: Math.round(shape.x),
				y: Math.round(shape.y),
			}
		}

		// For all other shapes (rectangle, ellipse, etc.), use their actual dimensions
		return {
			h: Math.round(shape.height ?? 100), // fallback for optional height (rhombus)
			shapeId: shape.shapeId,
			w: Math.round(shape.width ?? 100), // fallback for optional width (rhombus)
			x: Math.round(shape.x),
			y: Math.round(shape.y),
		}
	})

	const peripheralContent = peripheralContentWithIds.map(({ shapeId: _shapeId, ...rest }) => rest)

	return {
		shapes: peripheralContent,
	}
}
