import { TLAiChange } from '@tldraw/ai'
import {
	Editor,
	IndexKey,
	TLArrowShape,
	TLBindingId,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLRichText,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	toRichText,
} from 'tldraw'
import { IAgentUpdateEvent } from '../../worker/prompt/AgentEvent'
import { asColor, simpleFillToShapeFill } from '../../worker/simple/color'
import { Streaming } from '../types/Streaming'

export function getTldrawAiChangesFromUpdateEvent({
	editor,
	event,
}: {
	editor: Editor
	event: Streaming<IAgentUpdateEvent>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!event.complete) return changes

	const update = event.update
	update.shapeId = `shape:${update.shapeId}`

	switch (update._type) {
		case 'text': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLTextShape> = {
				id: update.shapeId as TLShapeId,
				type: 'text',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? asColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'line': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY

			const points = {
				a1: {
					id: 'a1',
					index: 'a1' as IndexKey,
					x: 0,
					y: 0,
				},
				a2: {
					id: 'a2',
					index: 'a2' as IndexKey,
					x: endX,
					y: endY,
				},
			}

			const mergedShape: TLShapePartial<TLLineShape> = {
				id: update.shapeId as TLShapeId,
				type: 'line',
				x: startX,
				y: startY,
				props: {
					color: update.color ? asColor(update.color) : undefined,
					points,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'arrow': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY
			const bend = update.bend ?? 0

			const mergedShape: TLShapePartial<TLArrowShape> = {
				id: update.shapeId as TLShapeId,
				type: 'arrow',
				x: startX,
				y: startY,
				props: {
					color: update.color ? asColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
					start: { x: 0, y: 0 },
					end: { x: endX, y: endY },
					bend,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})

			const bindings = editor.getBindingsFromShape(update.shapeId as TLShapeId, 'arrow')
			for (const binding of bindings) {
				changes.push({
					type: 'deleteBinding',
					description: 'Cleaning up old bindings',
					bindingId: binding.id as TLBindingId,
				})
			}

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = update.fromId ? editor.getShape(update.fromId as TLShapeId) : null
			if (startShape) {
				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: update.shapeId as TLShapeId,
						toId: startShape.id as TLShapeId,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'start',
						},
						meta: {},
					},
				})
			}

			// Does the arrow have an end shape? Then try to create the binding
			const endShape = update.toId ? editor.getShape(update.toId as TLShapeId) : null
			if (endShape) {
				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: update.shapeId as TLShapeId,
						toId: endShape.id as TLShapeId,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'end',
						},
						meta: {},
					},
				})
			}

			break
		}
		case 'cloud':
		case 'rectangle':
		case 'triangle':
		case 'diamond':
		case 'hexagon':
		case 'oval':
		case 'x-box':
		case 'pentagon':
		case 'octagon':
		case 'star':
		case 'rhombus':
		case 'rhombus-2':
		case 'trapezoid':
		case 'arrow-right':
		case 'arrow-left':
		case 'arrow-up':
		case 'arrow-down':
		case 'check-box':
		case 'heart':
		case 'ellipse': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)

			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			// Create a merged shape object that starts with all properties from shapeOnCanvas and overrides with any properties from the update. Returns undefined if there are no changes to that field, so the editor function won't try to update it.
			const mergedShape: TLShapePartial<TLGeoShape> = {
				id: update.shapeId as TLShapeId,
				type: 'geo',
				props: {
					color: update.color ? asColor(update.color) : undefined,
					geo: update._type,
					w: update.width,
					h: update.height,
					fill: update.fill ? simpleFillToShapeFill(update.fill) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})

			break
		}
		case 'note': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLNoteShape> = {
				id: update.shapeId as TLShapeId,
				type: 'note',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? asColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})

			break
		}
		case 'unknown': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLShape> = {
				id: update.shapeId as TLShapeId,
				type: shapeOnCanvas.type,
				x: update.x,
				y: update.y,
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})

			break
		}
	}

	return changes
}

function toRichTextIfNeeded(text: string | TLRichText): TLRichText {
	if (typeof text === 'string') {
		return toRichText(text)
	}
	return text
}
