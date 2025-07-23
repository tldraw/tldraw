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
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	toRichText,
} from 'tldraw'
import {
	ISimpleColor,
	ISimpleCreateEvent,
	ISimpleDeleteEvent,
	ISimpleEvent,
	ISimpleFill,
	ISimpleLabelEvent,
	ISimpleMoveEvent,
	ISimpleUpdateEvent,
	SimpleColor,
} from './schema'

function toRichTextIfNeeded(text: string | { type: string; content: any[] }): TLRichText {
	if (typeof text === 'string') {
		return toRichText(text)
	}
	return text
}

type MaybeComplete<T> = (Partial<T> & { complete: false }) | (T & { complete: true })

export function getTldrawAiChangesFromSimpleEvents(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleEvent>
): TLAiChange[] {
	if (event.complete) {
		console.log('getTldrawAiChangesFromSimpleEvents [EVENT FROM MODEL]', event)
	}

	switch (event._type) {
		case 'update': {
			return getTldrawAiChangesFromSimpleUpdateEvent(prompt, event)
		}
		case 'create': {
			return getTldrawAiChangesFromSimpleCreateEvent(prompt, event)
		}
		case 'label': {
			return getTldrawAiChangesFromSimpleLabelEvent(prompt, event)
		}
		case 'delete': {
			return getTldrawAiChangesFromSimpleDeleteEvent(prompt, event)
		}
		case 'move': {
			return getTldrawAiChangesFromSimpleMoveEvent(prompt, event)
		}
		default: {
			return [{ ...event, type: 'custom', action: event._type }]
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

function getTldrawAiChangesFromSimpleUpdateEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleUpdateEvent>
): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!event.complete) {
		const update = event.update

		changes.push({
			complete: false,
			type: 'updateShape',
			description: event.intent ?? '',
			shape: {
				id: (update?.shapeId ?? '') as TLShapeId,
				type: '',
				meta: {
					note: update?.note ?? '',
				},
			},
		})

		return changes
	}

	const update = event.update

	switch (update._type) {
		case 'text': {
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLTextShape> = {
				id: update.shapeId as TLShapeId,
				type: 'text',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'line': {
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			let x: number | undefined
			let y: number | undefined
			let points:
				| {
						a1: { id: string; index: IndexKey; x: number; y: number }
						a2: { id: string; index: IndexKey; x: number; y: number }
				  }
				| undefined

			if (
				update.x1 !== undefined &&
				update.x2 !== undefined &&
				update.y1 !== undefined &&
				update.y2 !== undefined
			) {
				x = Math.min(update.x1, update.x2)
				y = Math.min(update.y1, update.y2)
				points = {
					a1: {
						id: 'a1',
						index: 'a1' as IndexKey,
						x: update.x1,
						y: update.y1,
					},
					a2: {
						id: 'a2',
						index: 'a2' as IndexKey,
						x: update.x2,
						y: update.y2,
					},
				}
			}

			const mergedShape: TLShapePartial<TLLineShape> = {
				id: update.shapeId as TLShapeId,
				type: 'line',
				x,
				y,
				props: {
					color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
					points,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'arrow': {
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			let start: { x: number; y: number } | undefined
			let end: { x: number; y: number } | undefined
			if (
				update.x1 !== undefined &&
				update.y1 !== undefined &&
				update.x2 !== undefined &&
				update.y2 !== undefined
			) {
				start = {
					x: update.x1,
					y: update.y1,
				}
				end = {
					x: update.x2,
					y: update.y2,
				}
			}

			const mergedShape: TLShapePartial<TLArrowShape> = {
				id: update.shapeId as TLShapeId,
				type: 'arrow',
				x: 0,
				y: 0,
				props: {
					color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
					text: update.text ?? undefined,
					start,
					end,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			} satisfies TLAiUpdateShapeChange<TLArrowShape>)

			for (const binding of prompt.canvasContent.bindings.filter(
				(b) => b.fromId === update.shapeId
			)) {
				changes.push({
					complete: event.complete,
					type: 'deleteBinding',
					description: 'Cleaning up old bindings',
					bindingId: binding.id as any,
				})
			}

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = update.fromId
				? prompt.canvasContent.shapes.find((s) => s.id === update.fromId)
				: null
			if (startShape) {
				changes.push({
					complete: event.complete,
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
				} satisfies TLAiCreateBindingChange<TLArrowBinding>)
			}

			// Does the arrow have an end shape? Then try to create the binding
			const endShape = update.toId
				? prompt.canvasContent.shapes.find((s) => s.id === update.toId)
				: null
			if (endShape) {
				changes.push({
					complete: event.complete,
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
				} satisfies TLAiCreateBindingChange<TLArrowBinding>)
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
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			// Create a merged shape object that starts with all properties from shapeOnCanvas  and overrides with any properties from the update. Returns undefined if there are no changes to that field, so the editor function won't try to update it.
			const mergedShape: TLShapePartial<TLGeoShape> = {
				id: update.shapeId as TLShapeId,
				type: 'geo',
				props: {
					color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
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
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			} satisfies TLAiUpdateShapeChange<TLGeoShape>)

			break
		}
		case 'note': {
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLNoteShape> = {
				id: update.shapeId as TLShapeId,
				type: 'note',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			} satisfies TLAiUpdateShapeChange<TLNoteShape>)

			break
		}
		case 'unknown': {
			const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === update.shapeId)
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
				complete: event.complete,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: mergedShape,
			} satisfies TLAiUpdateShapeChange<TLShape>)

			break
		}
	}

	return changes
}

function getTldrawAiChangesFromSimpleCreateEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleCreateEvent>
): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!event.complete) {
		const shape = event.shape
		changes.push({
			complete: false,
			type: 'createShape',
			description: event.intent ?? '',
			shape: {
				id: (shape?.shapeId ?? '') as TLShapeId,
				type: '',
				meta: {
					note: shape?.note ?? '',
				},
			},
		})
		return changes
	}

	const shape = event.shape
	switch (shape._type) {
		case 'text': {
			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shape.shapeId as any,
					type: 'text',
					x: shape.x,
					y: shape.y,
					props: {
						richText: toRichTextIfNeeded(shape.text ?? ''),
						color: getTldrawColorFromFuzzyColor(shape.color),
						textAlign: shape.textAlign ?? 'middle',
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			} satisfies TLAiCreateShapeChange<TLTextShape>)
			break
		}
		case 'line': {
			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'line',
					x: minX,
					y: minY,
					props: {
						points: {
							a1: {
								id: 'a1',
								index: 'a1' as IndexKey,
								x: x1 - minX,
								y: y1 - minY,
							},
							a2: {
								id: 'a2',
								index: 'a2' as IndexKey,
								x: x2 - minX,
								y: y2 - minY,
							},
						},
						color: getTldrawColorFromFuzzyColor(shape.color),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			} satisfies TLAiCreateShapeChange<TLLineShape>)
			break
		}
		case 'arrow': {
			const { shapeId, fromId, toId } = shape

			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			// Make sure that the shape itself is the first change
			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId as TLShapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						color: getTldrawColorFromFuzzyColor(shape.color),
						text: shape.text ?? '',
						start: { x: x1 - minX, y: y1 - minY },
						end: { x: x2 - minX, y: y2 - minY },
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			} satisfies TLAiCreateShapeChange<TLArrowShape>)

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = fromId ? prompt.canvasContent.shapes.find((s) => s.id === fromId) : null

			if (startShape) {
				changes.push({
					complete: event.complete,
					type: 'createBinding',
					description: event.intent ?? '',
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
					complete: event.complete,
					type: 'createBinding',
					description: event.intent ?? '',
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
			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'geo',
					x: shape.x,
					y: shape.y,
					props: {
						geo: shape._type,
						w: shape.width,
						h: shape.height,
						color: getTldrawColorFromFuzzyColor(shape.color),
						fill: simpleFillToShapeFill(shape.fill ?? 'none'),
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			} satisfies TLAiCreateShapeChange<TLGeoShape>)
			break
		}

		case 'note': {
			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'note',
					x: shape.x,
					y: shape.y,
					props: {
						color: getTldrawColorFromFuzzyColor(shape.color),
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			} satisfies TLAiCreateShapeChange<TLNoteShape>)
			break
		}

		case 'unknown': {
			// shouldn't really appear here...

			const originalShape = prompt.canvasContent.shapes.find((s) => s.id === shape.shapeId)
			if (!originalShape) break

			changes.push({
				complete: event.complete,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					...originalShape,
					meta: {
						note: shape.note ?? '',
					},
				},
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
	event: MaybeComplete<ISimpleDeleteEvent>
): TLAiChange[] {
	const changes: TLAiChange[] = []

	if (!event.complete) {
		changes.push({
			complete: false,
			type: 'deleteShape',
			description: event.intent ?? '',
			shapeId: '' as TLShapeId,
		})
		return changes
	}

	const shapeId = event.shapeId
	changes.push({
		complete: event.complete,
		type: 'deleteShape',
		description: event.intent ?? '',
		shapeId: shapeId as TLShapeId,
	})

	return changes
}

function getTldrawAiChangesFromSimpleMoveEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleMoveEvent>
): TLAiChange[] {
	const changes: TLAiChange[] = []

	if (!event.complete) {
		return changes
	}

	const move = event.move
	const intent = event.intent

	const { x: newX, y: newY } = move

	const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === move.shapeId)
	if (!shapeOnCanvas) {
		throw new Error(`Shape ${move.shapeId} not found in canvas`)
	}

	// When moving arrows and lines, we tell the model just to x1 and y1, and the x2 and y2 will be updated automatically. This logic here handles that
	if (shapeOnCanvas.type === 'arrow') {
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: getUpdatedArrowGivenSimpleMove(prompt, move.shapeId, newX, newY),
		})
	} else if (shapeOnCanvas.type === 'line') {
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: getUpdatedLineGivenSimpleMove(prompt, move.shapeId, newX, newY),
		})
	} else {
		// For all other shapes, update x and y only
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: {
				id: move.shapeId as TLShapeId,
				x: move.x,
				y: move.y,
			},
		})
	}

	return changes
}

function getTldrawAiChangesFromSimpleLabelEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleLabelEvent>
): TLAiChange[] {
	const changes: TLAiChange[] = []

	if (!event.complete) {
		return changes
	}

	const { label, intent } = event
	const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === label.shapeId)
	if (!shapeOnCanvas) {
		throw new Error(`Shape ${label.shapeId} not found in canvas`)
	}

	if (shapeOnCanvas.type === 'arrow') {
		// For arrows, set text, not richText
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: {
				id: label.shapeId as TLShapeId,
				props: {
					text: label.text ?? '',
				},
			},
		})
	} else {
		// For all other shapes, set richText
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: {
				id: label.shapeId as TLShapeId,
				props: {
					richText: toRichTextIfNeeded(label.text ?? ''),
				},
			},
		})
	}

	return changes
}

function getTldrawColorFromFuzzyColor(simpleColor: any): ISimpleColor {
	if (SimpleColor.safeParse(simpleColor).success) {
		return simpleColor as ISimpleColor
	}

	switch (simpleColor) {
		case 'pink': {
			return 'light-violet'
		}
		case 'light-pink': {
			return 'light-violet'
		}
	}

	return 'black'
}

function getUpdatedLineGivenSimpleMove(
	prompt: TLAiSerializedPrompt,
	shapeId: string,
	newX: number,
	newY: number
) {
	const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === shapeId)
	if (!shapeOnCanvas) {
		throw new Error(`Shape ${shapeId} not found in canvas`)
	}

	const points = (shapeOnCanvas as TLLineShape).props.points

	const currentX1 = shapeOnCanvas.x + points['a1'].x
	const currentY1 = shapeOnCanvas.y + points['a1'].y
	const currentX2 = shapeOnCanvas.x + points['a2'].x
	const currentY2 = shapeOnCanvas.y + points['a2'].y

	const dx = newX - currentX1
	const dy = newY - currentY1

	const newX1 = currentX1 + dx
	const newY1 = currentY1 + dy

	const newX2 = currentX2 + dx
	const newY2 = currentY2 + dy

	const newA1 = {
		...points['a1'],
		x: 0,
		y: 0,
	}
	const newA2 = {
		...points['a2'],
		x: newX2 - newX1,
		y: newY2 - newY1,
	}

	return {
		id: shapeId as any,
		x: newX1,
		y: newY1,
		props: {
			points: {
				a1: newA1,
				a2: newA2,
			},
		},
	}
}

function getUpdatedArrowGivenSimpleMove(
	prompt: TLAiSerializedPrompt,
	shapeId: string,
	newX: number,
	newY: number
) {
	const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === shapeId)
	if (!shapeOnCanvas) {
		throw new Error(`Shape ${shapeId} not found in canvas`)
	}

	const currentX1 = shapeOnCanvas.x + (shapeOnCanvas as TLArrowShape).props.start.x
	const currentY1 = shapeOnCanvas.y + (shapeOnCanvas as TLArrowShape).props.start.y
	const currentX2 = shapeOnCanvas.x + (shapeOnCanvas as TLArrowShape).props.end.x
	const currentY2 = shapeOnCanvas.y + (shapeOnCanvas as TLArrowShape).props.end.y

	const dx = newX - currentX1
	const dy = newY - currentY1

	const newX1 = currentX1 + dx
	const newY1 = currentY1 + dy

	const newX2 = currentX2 + dx
	const newY2 = currentY2 + dy

	return {
		id: shapeId as any,
		x: newX1,
		y: newY1,
		props: {
			start: { x: 0, y: 0 },
			end: { x: newX2 - newX1, y: newY2 - newY1 },
		},
	}
}
