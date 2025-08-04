import { compact, createShapeId, Editor, TLShapeId, TLShapePartial, toRichText } from 'tldraw'
import { IResponse } from './xml-types'

export function handleResponseItem(editor: Editor, item: IResponse[number]) {
	try {
		switch (item.type) {
			case 'statement': {
				console.log('Statement:', item.text)
				break
			}
			case 'move-shape': {
				const shape = editor.getShape(item.shapeId as TLShapeId)
				if (!shape) break
				editor.updateShape({
					id: createShapeId(item.shapeId),
					type: shape.type,
					x: item.x,
					y: item.y,
				})
				break
			}
			case 'distribute-shapes': {
				const shapes = compact(
					item.shapeIds.map((id: string) => editor.getShape(createShapeId(id)))
				)
				editor.distributeShapes(shapes, item.direction)
				break
			}
			case 'stack-shapes': {
				const shapes = compact(
					item.shapeIds.map((id: string) => editor.getShape(createShapeId(id)))
				)
				editor.stackShapes(shapes, item.direction, item.gap)
				break
			}
			case 'align-shapes': {
				const shapes = compact(
					item.shapeIds.map((id: string) => editor.getShape(createShapeId(id)))
				)
				editor.alignShapes(shapes, item.alignment)
				break
			}
			case 'label-shape': {
				const shape = editor.getShape(createShapeId(item.shapeId))
				if (!shape) break
				if (shape.type === 'text' || shape.type === 'geo') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						props: {
							...shape.props,
							richText: toRichText(item.text),
						},
					})
				}
				break
			}
			case 'place-shape': {
				const shape = editor.getShape(createShapeId(item.shapeId))
				if (!shape) break
				const referenceShape = editor.getShape(createShapeId(item.referenceShapeId))
				if (!referenceShape) break
				const bbA = editor.getShapePageBounds(shape.id)!
				const bbR = editor.getShapePageBounds(referenceShape.id)!
				if (item.side === 'top' && item.align === 'start') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.minX + item.alignOffset,
						y: bbR.minY - bbA.height - item.sideOffset,
					})
				} else if (item.side === 'top' && item.align === 'center') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.midX - bbA.width / 2 + item.alignOffset,
						y: bbR.minY - bbA.height - item.sideOffset,
					})
				} else if (item.side === 'top' && item.align === 'end') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.maxX - bbA.width - item.alignOffset,
						y: bbR.minY - bbA.height - item.sideOffset,
					})
				} else if (item.side === 'bottom' && item.align === 'start') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.minX + item.alignOffset,
						y: bbR.maxY + item.sideOffset,
					})
				} else if (item.side === 'bottom' && item.align === 'center') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.midX - bbA.width / 2 + item.alignOffset,
						y: bbR.maxY + item.sideOffset,
					})
				} else if (item.side === 'bottom' && item.align === 'end') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.maxX - bbA.width - item.alignOffset,
						y: bbR.maxY + item.sideOffset,
					})
					// LEFT SIDE (corrected)
				} else if (item.side === 'left' && item.align === 'start') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.minX - bbA.width - item.sideOffset,
						y: bbR.minY + item.alignOffset,
					})
				} else if (item.side === 'left' && item.align === 'center') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.minX - bbA.width - item.sideOffset,
						y: bbR.midY - bbA.height / 2 + item.alignOffset,
					})
				} else if (item.side === 'left' && item.align === 'end') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.minX - bbA.width - item.sideOffset,
						y: bbR.maxY - bbA.height - item.alignOffset,
					})
					// RIGHT SIDE (corrected)
				} else if (item.side === 'right' && item.align === 'start') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.maxX + item.sideOffset,
						y: bbR.minY + item.alignOffset,
					})
				} else if (item.side === 'right' && item.align === 'center') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.maxX + item.sideOffset,
						y: bbR.midY - bbA.height / 2 + item.alignOffset,
					})
				} else if (item.side === 'right' && item.align === 'end') {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: bbR.maxX + item.sideOffset,
						y: bbR.maxY - bbA.height - item.alignOffset,
					})
				}
				break
			}
			case 'create-shape': {
				switch (item.shape.type) {
					case 'geo': {
						editor.createShape({
							type: 'geo',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								// Basic dimensions
								w: item.shape.width ?? 100,
								h: item.shape.height ?? 100,
								// Geometry type
								geo: item.shape.geo ?? 'rectangle',
								// Styling properties
								fill: item.shape.fill ?? 'none',
								color: item.shape.color ?? 'black',
								labelColor: item.shape.labelColor ?? 'black',
								dash: item.shape.dash ?? 'draw',
								size: item.shape.size ?? 'm',
								// Text properties
								richText: toRichText(item.shape.text ?? ''),
								font: item.shape.font ?? 'draw',
								align: item.shape.align ?? 'middle',
								verticalAlign: item.shape.verticalAlign ?? 'middle',
								// Transform properties
								scale: item.shape.scale ?? 1,
								growY: item.shape.growY ?? 0,
								// URL property
								url: item.shape.url ?? '',
							},
						})
						break
					}
					case 'text': {
						editor.createShape({
							type: 'text',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								color: item.shape.color ?? 'black',
								richText: toRichText(item.shape.text ?? ''),
							},
						})
						break
					}
					case 'note': {
						editor.createShape({
							type: 'note',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								// Styling properties
								color: item.shape.color ?? 'black',
								labelColor: item.shape.labelColor ?? 'black',
								size: item.shape.size ?? 'm',
								font: item.shape.font ?? 'draw',
								fontSizeAdjustment: item.shape.fontSizeAdjustment ?? 0,
								align: item.shape.align ?? 'middle',
								verticalAlign: item.shape.verticalAlign ?? 'middle',
								// Transform properties
								growY: item.shape.growY ?? 0,
								scale: item.shape.scale ?? 1,
								// Content properties
								richText: toRichText(item.shape.text ?? ''),
								url: item.shape.url ?? '',
							},
						})
						break
					}
					case 'frame': {
						editor.createShape({
							type: 'frame',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								w: item.shape.width ?? 100,
								h: item.shape.height ?? 100,
								name: item.shape.name ?? '',
								color: item.shape.color ?? 'black',
							},
						})
						break
					}
					case 'line': {
						// Create a simple two-point line
						const lineShape = item.shape as any // Cast to access XML attributes
						const startX = lineShape.startX ?? 0
						const startY = lineShape.startY ?? 0
						const endX = lineShape.endX ?? 100
						const endY = lineShape.endY ?? 0

						editor.createShape({
							type: 'line',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								color: item.shape.color ?? 'black',
								dash: item.shape.dash ?? 'draw',
								size: item.shape.size ?? 'm',
								spline: item.shape.spline ?? 'line',
								scale: item.shape.scale ?? 1,
								points: {
									start: {
										id: 'start',
										index: 'a1' as any,
										x: startX,
										y: startY,
									},
									end: {
										id: 'end',
										index: 'a2' as any,
										x: endX,
										y: endY,
									},
								},
							},
						})
						break
					}
					case 'highlight': {
						// Create a simple highlight with basic path
						const highlightShape = item.shape as any // Cast to access XML attributes
						editor.createShape({
							type: 'highlight',
							x: item.shape.x,
							y: item.shape.y,
							props: {
								color: item.shape.color ?? 'yellow',
								size: item.shape.size ?? 'm',
								scale: item.shape.scale ?? 1,
								isComplete: highlightShape.isComplete ?? true,
								isPen: highlightShape.isPen ?? false,
								segments: [
									{
										type: 'free',
										points: [
											{ x: 0, y: 0, z: 0.5 },
											{ x: 50, y: 0, z: 0.5 },
										],
									},
								],
							},
						})
						break
					}
				}
				break
			}
			case 'update-shape': {
				switch (item.shape.type) {
					case 'geo': {
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'geo',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.width !== undefined) propUpdates.w = item.shape.width
						if (item.shape.height !== undefined) propUpdates.h = item.shape.height
						if (item.shape.geo !== undefined) propUpdates.geo = item.shape.geo
						if (item.shape.fill !== undefined) propUpdates.fill = item.shape.fill
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color
						if (item.shape.labelColor !== undefined) propUpdates.labelColor = item.shape.labelColor
						if (item.shape.dash !== undefined) propUpdates.dash = item.shape.dash
						if (item.shape.size !== undefined) propUpdates.size = item.shape.size
						if (item.shape.text !== undefined) propUpdates.richText = toRichText(item.shape.text)
						if (item.shape.font !== undefined) propUpdates.font = item.shape.font
						if (item.shape.align !== undefined) propUpdates.align = item.shape.align
						if (item.shape.verticalAlign !== undefined)
							propUpdates.verticalAlign = item.shape.verticalAlign
						if (item.shape.scale !== undefined) propUpdates.scale = item.shape.scale
						if (item.shape.growY !== undefined) propUpdates.growY = item.shape.growY
						if (item.shape.url !== undefined) propUpdates.url = item.shape.url

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
					case 'text': {
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'text',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color
						if (item.shape.text !== undefined) propUpdates.richText = toRichText(item.shape.text)

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
					case 'note': {
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'note',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color
						if (item.shape.labelColor !== undefined) propUpdates.labelColor = item.shape.labelColor
						if (item.shape.size !== undefined) propUpdates.size = item.shape.size
						if (item.shape.font !== undefined) propUpdates.font = item.shape.font
						if (item.shape.fontSizeAdjustment !== undefined)
							propUpdates.fontSizeAdjustment = item.shape.fontSizeAdjustment
						if (item.shape.align !== undefined) propUpdates.align = item.shape.align
						if (item.shape.verticalAlign !== undefined)
							propUpdates.verticalAlign = item.shape.verticalAlign
						if (item.shape.growY !== undefined) propUpdates.growY = item.shape.growY
						if (item.shape.scale !== undefined) propUpdates.scale = item.shape.scale
						if (item.shape.text !== undefined) propUpdates.richText = toRichText(item.shape.text)
						if (item.shape.url !== undefined) propUpdates.url = item.shape.url

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
					case 'frame': {
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'frame',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.width !== undefined) propUpdates.w = item.shape.width
						if (item.shape.height !== undefined) propUpdates.h = item.shape.height
						if (item.shape.name !== undefined) propUpdates.name = item.shape.name
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
					case 'line': {
						const lineShape = item.shape as any
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'line',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color
						if (item.shape.dash !== undefined) propUpdates.dash = item.shape.dash
						if (item.shape.size !== undefined) propUpdates.size = item.shape.size
						if (lineShape.spline !== undefined) propUpdates.spline = lineShape.spline
						if (item.shape.scale !== undefined) propUpdates.scale = item.shape.scale

						// Handle points if start/end coordinates are provided
						if (
							lineShape.startX !== undefined ||
							lineShape.startY !== undefined ||
							lineShape.endX !== undefined ||
							lineShape.endY !== undefined
						) {
							propUpdates.points = [
								{
									id: `${item.shape.id}_start`,
									x: lineShape.startX ?? 0,
									y: lineShape.startY ?? 0,
								},
								{ id: `${item.shape.id}_end`, x: lineShape.endX ?? 100, y: lineShape.endY ?? 100 },
							]
						}

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
					case 'highlight': {
						const highlightShape = item.shape as any
						const shapeId = createShapeId(item.shape.id)
						const updates = {
							id: shapeId,
							type: 'highlight',
						} as TLShapePartial

						if (item.shape.x !== undefined) updates.x = item.shape.x
						if (item.shape.y !== undefined) updates.y = item.shape.y

						const propUpdates: any = {}
						if (item.shape.color !== undefined) propUpdates.color = item.shape.color
						if (item.shape.size !== undefined) propUpdates.size = item.shape.size
						if (item.shape.scale !== undefined) propUpdates.scale = item.shape.scale
						if (highlightShape.isComplete !== undefined)
							propUpdates.isComplete =
								highlightShape.isComplete === 'true' || highlightShape.isComplete === true
						if (highlightShape.isPen !== undefined)
							propUpdates.isPen = highlightShape.isPen === 'true' || highlightShape.isPen === true

						if (Object.keys(propUpdates).length > 0) {
							updates.props = propUpdates
						}

						editor.updateShape(updates)
						break
					}
				}
				break
			}
			case 'delete-shapes': {
				const shapes = compact(
					item.shapeIds.map((id: string) => editor.getShape(createShapeId(id)))
				)
				editor.deleteShapes(shapes)
				break
			}
		}
	} catch (error) {
		console.error('Error handling response item:', error)
	}
}
