import {
	TLAiChange,
	TLAiCreateBindingChange,
	TLAiCreateShapeChange,
	TLAiSerializedPrompt,
	TLAiUpdateShapeChange,
} from '@tldraw/ai'
import {
	IndexKey,
	TLArrowBinding,
	TLArrowShape,
	TLDefaultFillStyle,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLRichText,
	TLTextShape,
	toRichText,
} from 'tldraw'
import {
	ISimpleCreateEvent,
	ISimpleDeleteEvent,
	ISimpleEvent,
	ISimpleFill,
	ISimpleMoveEvent,
} from './schema'

function toRichTextIfNeeded(text: string | { type: string; content: any[] }): TLRichText {
	if (typeof text === 'string') {
		return toRichText(text)
	}
	return text
}

export function getTldrawAiChangesFromSimpleEvents(
	prompt: TLAiSerializedPrompt,
	event: ISimpleEvent
): TLAiChange[] {
	switch (event.type) {
		case 'update':
		case 'create': {
			return getTldrawAiChangesFromSimpleCreateOrUpdateEvent(prompt, event)
		}
		case 'delete': {
			return getTldrawAiChangesFromSimpleDeleteEvent(prompt, event)
		}
		case 'move': {
			return getTldrawAiChangesFromSimpleMoveEvent(prompt, event)
		}
		case 'think': {
			return []
		}
	}
}

const FILL_MAP: Record<ISimpleFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'fill',
	semi: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

function simpleFillToShapeFill(fill: ISimpleFill): TLDefaultFillStyle {
	return FILL_MAP[fill]
}

function getTldrawAiChangesFromSimpleCreateOrUpdateEvent(
	prompt: TLAiSerializedPrompt,
	event: ISimpleCreateEvent
): TLAiChange[] {
	const { shape } = event

	const changes: TLAiChange[] = []

	const shapeEventType = event.type === 'create' ? 'createShape' : 'updateShape'

	switch (shape.type) {
		case 'text': {
			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: {
					id: shape.shapeId as any,
					type: 'text',
					x: shape.x,
					y: shape.y,
					props: {
						richText: toRichTextIfNeeded(shape.text ?? ''),
						color: shape.color ?? 'black',
						textAlign: shape.textAlign ?? 'middle',
					},
				},
			} satisfies TLAiCreateShapeChange<TLTextShape> | TLAiUpdateShapeChange<TLTextShape>)
			break
		}
		case 'line': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)

			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: {
					id: shape.shapeId as any,
					type: 'line',
					x: minX,
					y: minY,
					props: {
						points: {
							a1: {
								id: 'a1',
								index: 'a2' as IndexKey,
								x: shape.x1 - minX,
								y: shape.y1 - minY,
							},
							a2: {
								id: 'a2',
								index: 'a2' as IndexKey,
								x: shape.x2 - minX,
								y: shape.y2 - minY,
							},
						},
						color: shape.color ?? 'black',
					},
				},
			} satisfies TLAiCreateShapeChange<TLLineShape> | TLAiUpdateShapeChange<TLLineShape>)
			break
		}
		case 'arrow': {
			const { shapeId, fromId, toId, x1, x2, y1, y2 } = shape

			// Make sure that the shape itself is the first change
			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: {
					id: shapeId as any,
					type: 'arrow',
					x: 0,
					y: 0,
					props: {
						color: shape.color ?? 'black',
						text: shape.text ?? '',
						start: { x: x1, y: y1 },
						end: { x: x2, y: y2 },
					},
				},
			} satisfies TLAiCreateShapeChange<TLArrowShape> | TLAiUpdateShapeChange<TLArrowShape>)

			if (shapeEventType === 'updateShape') {
				// Updating bindings is complicated, it's easier to just delete all bindings and recreate them
				for (const binding of prompt.canvasContent.bindings.filter((b) => b.fromId === 'shapeId')) {
					changes.push({
						type: 'deleteBinding',
						description: 'cleaning up old bindings',
						bindingId: binding.id as any,
					})
				}
			}

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = fromId ? prompt.canvasContent.shapes.find((s) => s.id === fromId) : null

			if (startShape) {
				changes.push({
					type: 'createBinding',
					description: shape.note ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId as any,
						toId: startShape.id,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'start',
						},
						meta: {},
					},
				} satisfies TLAiCreateBindingChange<TLArrowBinding>)
			}

			// Does the arrow have an end shape? Then try to create the binding

			const endShape = toId ? prompt.canvasContent.shapes.find((s) => s.id === toId) : null

			if (endShape) {
				changes.push({
					type: 'createBinding',
					description: shape.note ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId as any,
						toId: endShape.id,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'end',
						},
						meta: {},
					},
				} satisfies TLAiCreateBindingChange<TLArrowBinding>)
			}
			break
		}
		case 'cloud':
		case 'rectangle':
		case 'ellipse': {
			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: {
					id: shape.shapeId as any,
					type: 'geo',
					x: shape.x,
					y: shape.y,
					props: {
						geo: shape.type,
						w: shape.width,
						h: shape.height,
						color: shape.color ?? 'black',
						fill: simpleFillToShapeFill(shape.fill ?? 'none'),
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
				},
			} satisfies TLAiCreateShapeChange<TLGeoShape> | TLAiUpdateShapeChange<TLGeoShape>)
			break
		}

		case 'note': {
			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: {
					id: shape.shapeId as any,
					type: 'note',
					x: shape.x,
					y: shape.y,
					props: {
						color: shape.color ?? 'black',
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
				},
			} satisfies TLAiCreateShapeChange<TLNoteShape> | TLAiUpdateShapeChange<TLNoteShape>)
			break
		}

		case 'unknown': {
			// shouldn't really appear here...

			const originalShape = prompt.canvasContent.shapes.find((s) => s.id === shape.shapeId)
			if (!originalShape) break

			changes.push({
				type: shapeEventType,
				description: shape.note ?? '',
				shape: originalShape,
			})
			break
		}
	}

	// Since we made new shapes, we need to add them provisionally to the canvasContent
	// so that other references to these shapes or bindings will work correctly
	for (const change of changes) {
		if (change.type === 'createShape') {
			prompt.canvasContent.shapes.push(change.shape as any)
		} else if (change.type === 'createBinding') {
			prompt.canvasContent.bindings?.push(change.binding as any)
		}
	}

	return changes
}

function getTldrawAiChangesFromSimpleDeleteEvent(
	prompt: TLAiSerializedPrompt,
	event: ISimpleDeleteEvent
): TLAiChange[] {
	const { shapeId, intent } = event

	return [
		{
			type: 'deleteShape',
			description: intent ?? '',
			shapeId: shapeId as any,
		},
	]
}

function getTldrawAiChangesFromSimpleMoveEvent(
	prompt: TLAiSerializedPrompt,
	event: ISimpleMoveEvent
): TLAiChange[] {
	const { shapeId, intent } = event
	return [
		{
			type: 'updateShape',
			description: intent ?? '',
			shape: {
				id: shapeId as any,
				x: event.x,
				y: event.y,
			},
		},
	]
}
