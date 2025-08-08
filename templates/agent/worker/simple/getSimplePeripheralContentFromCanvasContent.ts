import { TLShape } from 'tldraw'
import { TLAgentContent } from '../../client/types/TLAgentPrompt'
import { getSimpleContentFromCanvasContent } from './getSimpleContentFromCanvasContent'

export interface PeripheralShape {
	h?: number
	w?: number
	x: number
	y: number
}

export function getPeripheralShapesFromCanvasContent(
	wholePageShapes: TLShape[],
	viewportContent: TLAgentContent
): {
	shapes: PeripheralShape[]
} {
	const simpleViewportContent = getSimpleContentFromCanvasContent(viewportContent)
	const simpleWholePageContent = getSimpleContentFromCanvasContent({
		shapes: wholePageShapes,
		bindings: [],
	})

	const wholePageLessViewportContent = simpleWholePageContent.shapes.filter(
		(shape) => !simpleViewportContent.shapes.some((s) => s.shapeId === shape.shapeId)
	)

	const peripheralContentWithIds = wholePageLessViewportContent.map((shape) => {
		// For lines, use the bounding box
		if (shape._type === 'line') {
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

		// For arrows, use the bounding box
		if (shape._type === 'arrow') {
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

		// Notes have a fixed size
		if (shape._type === 'note') {
			return {
				h: 100,
				shapeId: shape.shapeId,
				w: 100,
				x: Math.round(shape.x),
				y: Math.round(shape.y),
			}
		}

		// Shapes without dimensions
		if (shape._type === 'text' || shape._type === 'unknown') {
			return {
				shapeId: shape.shapeId,
				x: Math.round(shape.x),
				y: Math.round(shape.y),
			}
		}

		// For all other shapes (rectangle, ellipse, etc.), use their actual dimensions
		return {
			h: Math.round(shape.height),
			shapeId: shape.shapeId,
			w: Math.round(shape.width),
			x: Math.round(shape.x),
			y: Math.round(shape.y),
		}
	})

	const peripheralContent = peripheralContentWithIds.map(({ shapeId: _shapeId, ...rest }) => rest)

	return {
		shapes: peripheralContent,
	}
}
