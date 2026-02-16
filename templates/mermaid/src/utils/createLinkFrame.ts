/**
 * Create or update a frame around linked diagram shapes
 */

import { Editor, TLShapeId, createShapeId } from 'tldraw'

export function createOrUpdateLinkFrame(
	editor: Editor,
	shapeIds: string[],
	codeBlockId: string
): TLShapeId | null {
	console.log('createOrUpdateLinkFrame called with:', {
		shapeIds,
		codeBlockId,
		shapeCount: shapeIds.length,
	})

	if (shapeIds.length === 0) {
		console.log('No shapes provided, returning null')
		return null
	}

	// Check if a link frame already exists for this code block
	const existingFrame = editor
		.getCurrentPageShapes()
		.find(
			(s) =>
				s.type === 'frame' &&
				s.meta.isLinkFrame === true &&
				s.meta.linkedCodeBlockId === codeBlockId
		)

	console.log('Existing frame check:', existingFrame ? existingFrame.id : 'none')

	// Get bounds of all shapes
	const shapes = shapeIds.map((id) => editor.getShape(id)).filter(Boolean)
	if (shapes.length === 0) return null

	// Calculate bounding box
	const shapeBounds = shapes.map((s) => editor.getShapePageBounds(s)).filter(Boolean)
	if (shapeBounds.length === 0) return null

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	for (const b of shapeBounds) {
		minX = Math.min(minX, b.x)
		minY = Math.min(minY, b.y)
		maxX = Math.max(maxX, b.maxX)
		maxY = Math.max(maxY, b.maxY)
	}

	// Add padding
	const padding = 20
	const frameProps = {
		x: minX - padding,
		y: minY - padding,
		props: {
			w: maxX - minX + padding * 2,
			h: maxY - minY + padding * 2,
			name: '🔗 Linked Diagram',
		},
		meta: {
			isLinkFrame: true,
			linkedCodeBlockId: codeBlockId,
		},
	}

	if (existingFrame) {
		// Ensure all shapes are in the frame
		for (const shapeId of shapeIds) {
			const shape = editor.getShape(shapeId)
			if (shape && shape.parentId !== existingFrame.id) {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					parentId: existingFrame.id,
				})
			}
		}

		// Update existing frame size/position
		editor.updateShape({
			id: existingFrame.id,
			type: 'frame',
			...frameProps,
		})
		return existingFrame.id
	} else {
		// Create new frame
		const frameId = createShapeId()
		console.log('Creating new frame:', frameId, 'at', frameProps.x, frameProps.y, 'size', frameProps.props)
		console.log('Frame bounds - minX:', minX, 'minY:', minY)
		editor.createShape({
			id: frameId,
			type: 'frame',
			...frameProps,
		})

		console.log('Moving', shapeIds.length, 'shapes into frame')

		// Move shapes into the frame and adjust their positions
		// Frame is at (minX - 20, minY - 20), we want shapes starting at (10, 10) inside frame
		const targetPadding = 10
		for (const shapeId of shapeIds) {
			const shape = editor.getShape(shapeId)
			if (shape) {
				const bounds = editor.getShapePageBounds(shape)
				if (bounds) {
					// Convert from page coordinates to frame-relative coordinates
					// Then adjust so leftmost shape is at (10, 10)
					const newX = bounds.x - minX + targetPadding
					const newY = bounds.y - minY + targetPadding
					editor.updateShape({
						id: shapeId,
						type: shape.type,
						parentId: frameId,
						x: newX,
						y: newY,
					})
					console.log('Moved shape', shapeId, 'from page pos', bounds.x, bounds.y, 'to frame-relative', newX, newY)
				}
			}
		}

		console.log('Frame creation complete, returning:', frameId)
		return frameId
	}
}

export function removeLinkFrame(editor: Editor, codeBlockId: string): void {
	const linkFrame = editor
		.getCurrentPageShapes()
		.find(
			(s) =>
				s.type === 'frame' &&
				s.meta.isLinkFrame === true &&
				s.meta.linkedCodeBlockId === codeBlockId
		)

	if (linkFrame) {
		// Move children out of frame first
		const children = editor.getSortedChildIdsForParent(linkFrame.id)
		for (const childId of children) {
			const child = editor.getShape(childId)
			if (child) {
				editor.updateShape({
					id: childId,
					type: child.type,
					parentId: editor.getCurrentPageId(),
				})
			}
		}
		// Delete the frame
		editor.deleteShape(linkFrame.id)
	}
}
