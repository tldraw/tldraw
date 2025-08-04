import { compact, createShapeId, Editor, TLShapeId, toRichText } from 'tldraw'
import { IResponse } from './xml-types'

export function handleResponseItem(editor: Editor, item: IResponse[number]) {
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
			const shapes = compact(item.shapeIds.map((id: string) => editor.getShape(createShapeId(id))))
			editor.distributeShapes(shapes, item.direction)
			break
		}
		case 'stack-shapes': {
			const shapes = compact(item.shapeIds.map((id: string) => editor.getShape(createShapeId(id))))
			editor.stackShapes(shapes, item.direction, item.gap)
			break
		}
		case 'align-shapes': {
			const shapes = compact(item.shapeIds.map((id: string) => editor.getShape(createShapeId(id))))
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
							w: item.shape.width ?? 100,
							h: item.shape.height ?? 100,
							richText: toRichText(item.shape.text ?? ''),
							color: item.shape.color ?? 'black',
							fill: item.shape.fill ?? 'none',
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
			}
			break
		}
		case 'delete-shapes': {
			const shapes = compact(item.shapeIds.map((id: string) => editor.getShape(createShapeId(id))))
			editor.deleteShapes(shapes)
			break
		}
	}
}
