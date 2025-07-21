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

	switch (event.type) {
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
			return [{ ...event, type: 'custom', action: event.type }]
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
	if (!event.complete) {
		const shapes = event.updates ?? []
		const changes: TLAiChange[] = []

		for (const shape of shapes) {
			changes.push({
				complete: false,
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: (shape.shapeId ?? '') as any,
					type: '',
					meta: {
						note: shape.note ?? '',
					},
				},
			})
		}

		return changes
	}

	const { updates } = event
	const changes: TLAiChange[] = []

	for (const update of updates) {
		switch (update.type) {
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

				const minX = Math.min(update.x1, update.x2)
				const minY = Math.min(update.y1, update.y2)

				const mergedShape: TLShapePartial<TLLineShape> = {
					id: update.shapeId as TLShapeId,
					type: 'line',
					x: minX,
					y: minY,
					props: {
						color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
						points: {
							a1: {
								id: 'a1',
								index: 'a1' as IndexKey,
								x: update.x1 - minX,
								y: update.y1 - minY,
							},
							a2: {
								id: 'a2',
								index: 'a2' as IndexKey,
								x: update.x2 - minX,
								y: update.y2 - minY,
							},
						},
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

				const mergedShape: TLShapePartial<TLArrowShape> = {
					id: update.shapeId as TLShapeId,
					type: 'arrow',
					x: 0,
					y: 0,
					props: {
						color: update.color ? getTldrawColorFromFuzzyColor(update.color) : undefined,
						text: update.text ?? undefined,
						start: { x: update.x1, y: update.y1 },
						end: { x: update.x2, y: update.y2 },
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
						geo: update.type,
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
	}

	return changes
}

function getTldrawAiChangesFromSimpleCreateEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleCreateEvent>
): TLAiChange[] {
	const shapes = (event as ISimpleCreateEvent).shapes ?? []

	if (!event.complete) {
		const changes: TLAiChange[] = []

		for (const shape of shapes) {
			changes.push({
				complete: false,
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: (shape.shapeId ?? '') as any,
					type: '',
					meta: {
						note: shape.note ?? '',
					},
				},
			})
		}

		return changes
	}

	const changes: TLAiChange[] = []

	for (const shape of shapes) {
		switch (shape.type) {
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
				const minX = Math.min(shape.x1, shape.x2)
				const minY = Math.min(shape.y1, shape.y2)

				changes.push({
					complete: event.complete,
					type: 'createShape',
					description: event.intent ?? '',
					shape: {
						id: shape.shapeId as any,
						type: 'line',
						x: minX,
						y: minY,
						props: {
							points: {
								a1: {
									id: 'a1',
									index: 'a1' as IndexKey,
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
				const { shapeId, fromId, toId, x1, x2, y1, y2 } = shape

				// Make sure that the shape itself is the first change
				changes.push({
					complete: event.complete,
					type: 'createShape',
					description: event.intent ?? '',
					shape: {
						id: shapeId as any,
						type: 'arrow',
						x: 0,
						y: 0,
						props: {
							color: getTldrawColorFromFuzzyColor(shape.color),
							text: shape.text ?? '',
							start: { x: x1, y: y1 },
							end: { x: x2, y: y2 },
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
						id: shape.shapeId as any,
						type: 'geo',
						x: shape.x,
						y: shape.y,
						props: {
							geo: shape.type,
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
						id: shape.shapeId as any,
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
	const { shapeIds = [], intent = '' } = event

	const changes: TLAiChange[] = []

	for (const shapeId of shapeIds) {
		changes.push({
			complete: event.complete,
			type: 'deleteShape',
			description: intent,
			shapeId: shapeId as any,
		})
	}

	return changes
}

function getTldrawAiChangesFromSimpleMoveEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleMoveEvent>
): TLAiChange[] {
	const { moves = [], intent = '' } = event
	const changes: TLAiChange[] = []

	for (const moveItem of moves) {
		changes.push({
			complete: event.complete,
			type: 'updateShape',
			description: intent,
			shape: {
				id: moveItem.shapeId as any,
				x: moveItem.x,
				y: moveItem.y,
			},
		})
	}

	return changes
}

function getTldrawAiChangesFromSimpleLabelEvent(
	prompt: TLAiSerializedPrompt,
	event: MaybeComplete<ISimpleLabelEvent>
): TLAiChange[] {
	const { labels = [], intent = '' } = event
	const changes: TLAiChange[] = []

	for (const labelItem of labels) {
		const shapeOnCanvas = prompt.canvasContent.shapes.find((s) => s.id === labelItem.shapeId)

		if (!shapeOnCanvas) {
			throw new Error(`Shape ${labelItem.shapeId} not found in canvas`)
		}

		if (shapeOnCanvas.type === 'arrow') {
			// For arrows, set text, not richText
			changes.push({
				complete: event.complete,
				type: 'updateShape',
				description: intent,
				shape: {
					id: labelItem.shapeId as any,
					props: {
						text: labelItem.text ?? '',
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
					id: labelItem.shapeId as any,
					props: {
						richText: toRichTextIfNeeded(labelItem.text ?? ''),
					},
				},
			})
		}
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
