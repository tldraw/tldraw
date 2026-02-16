/**
 * Convert Mermaid code to tldraw shapes
 */

import { Editor, Vec } from 'tldraw'
import { getDiagramType, extractMermaidCode } from './mermaidDetection'
import { parseMermaidFlowchart } from './parseMermaidFlowchart'
import { parseSequenceDiagram } from './parseSequenceDiagram'
import { parseClassDiagram } from './parseClassDiagram'
import { parseStateDiagram } from './parseStateDiagram'
import { parseErDiagram } from './parseErDiagram'
import { createShapesFromFlowchart } from './createShapesFromFlowchart'
import { createShapesFromSequenceDiagram } from './createShapesFromSequenceDiagram'
import { createShapesFromClassDiagram } from './createShapesFromClassDiagram'
import { createShapesFromStateDiagram } from './createShapesFromStateDiagram'
import { createShapesFromErDiagram } from './createShapesFromErDiagram'
import { renderMermaidToSvg } from './renderMermaidToSvg'
import { logger } from './logger'
import { createOrUpdateLinkFrame } from './createLinkFrame'

/**
 * Convert Mermaid code to tldraw shapes
 * @param codeBlockId - Optional ID of the code block that's creating these shapes (for linking)
 */
export async function convertCodeToShapes(
	editor: Editor,
	code: string,
	position: Vec = new Vec(0, 0),
	codeBlockId?: string
): Promise<string[]> {
	// Extract and detect Mermaid code
	const extractedCode = extractMermaidCode(code)
	if (!extractedCode) {
		logger.error('convertCodeToShapes', new Error('Could not extract Mermaid code'))
		return []
	}

	const diagramType = getDiagramType(extractedCode)
	if (!diagramType) {
		logger.error('convertCodeToShapes', new Error('Could not detect diagram type'))
		return []
	}

	logger.codeToShapes(extractedCode, diagramType)

	// Store old shape IDs and frame info if updating
	let oldShapeIds: string[] = []
	let existingFrameId: string | null = null
	let existingFrame: any = null

	if (codeBlockId) {
		console.log('Looking for existing frame for code block:', codeBlockId)
		const codeBlock = editor.getShape(codeBlockId)
		if (codeBlock && codeBlock.meta.linkedShapeIds) {
			oldShapeIds = (codeBlock.meta.linkedShapeIds as string[]).filter((id) => editor.getShape(id))
			console.log('Found old shape IDs:', oldShapeIds)
		}

		// Find existing frame
		const allFrames = editor.getCurrentPageShapes().filter((s) => s.type === 'frame')
		console.log('All frames on page:', allFrames.length)
		allFrames.forEach((f) => {
			console.log('Frame:', f.id, 'meta:', f.meta)
		})

		existingFrame = allFrames.find(
			(s) => s.meta.isLinkFrame === true && s.meta.linkedCodeBlockId === codeBlockId
		)

		if (existingFrame) {
			console.log('Found existing frame:', existingFrame.id)
			existingFrameId = existingFrame.id

			// Delete old shapes NOW before creating new ones
			if (oldShapeIds.length > 0) {
				console.log('Deleting old shapes:', oldShapeIds)
				editor.deleteShapes(oldShapeIds)
				oldShapeIds = [] // Clear so we don't delete again later
			}
		} else {
			console.log('No existing frame found')
		}
	}

	// Track shapes before creation
	const shapeIdsBefore = new Set(editor.getCurrentPageShapeIds())

	try {
		// Try native shape conversion first
		switch (diagramType) {
			case 'flowchart': {
				logger.parsing('flowchart', extractedCode)
				const flowchart = parseMermaidFlowchart(extractedCode)
				logger.parsed(flowchart)
				createShapesFromFlowchart(editor, flowchart, position)
				logger.success('Flowchart shapes created')
				break
			}

			case 'sequenceDiagram': {
				logger.parsing('sequence diagram', extractedCode)
				const sequence = parseSequenceDiagram(extractedCode)
				logger.parsed(sequence)
				createShapesFromSequenceDiagram(editor, sequence, position)
				logger.success('Sequence diagram shapes created')
				break
			}

			case 'classDiagram': {
				logger.parsing('class diagram', extractedCode)
				const classDiagram = parseClassDiagram(extractedCode)
				logger.parsed(classDiagram)
				createShapesFromClassDiagram(editor, classDiagram, position)
				logger.success('Class diagram shapes created')
				break
			}

			case 'stateDiagram': {
				logger.parsing('state diagram', extractedCode)
				const stateDiagram = parseStateDiagram(extractedCode)
				logger.parsed(stateDiagram)
				createShapesFromStateDiagram(editor, stateDiagram, position)
				logger.success('State diagram shapes created')
				break
			}

			case 'erDiagram': {
				logger.parsing('ER diagram', extractedCode)
				const erDiagram = parseErDiagram(extractedCode)
				logger.parsed(erDiagram)
				createShapesFromErDiagram(editor, erDiagram, position)
				logger.success('ER diagram shapes created')
				break
			}

			default: {
				// Fall back to SVG rendering for unsupported diagram types
				logger.parsing('SVG fallback', extractedCode)
				const svgDataUrl = await renderMermaidToSvg(extractedCode)

				// Create an image shape with the SVG
				const asset = await editor.getAssetForExternalContent({
					type: 'url',
					url: svgDataUrl,
				})

				if (!asset) {
					throw new Error('Could not create asset from SVG')
				}

				editor.createAssets([asset])
				editor.createShape({
					type: 'image',
					x: position.x,
					y: position.y,
					props: {
						assetId: asset.id,
						w: 400,
						h: 300,
					},
				})
				logger.success(`${diagramType} rendered as SVG image`)
			}
		}

		// Get shapes that were created
		const shapeIdsAfter = Array.from(editor.getCurrentPageShapeIds())
		const createdShapeIds = shapeIdsAfter.filter((id) => !shapeIdsBefore.has(id))

		console.log('Created shape IDs:', createdShapeIds)

		// Link shapes to code block if provided
		if (codeBlockId && createdShapeIds.length > 0) {
			console.log('Linking shapes to code block:', codeBlockId, 'shapes:', createdShapeIds)

			// If there's an existing frame, calculate bounds once for all shapes
			let minPageX = Infinity
			let minPageY = Infinity
			if (existingFrameId && existingFrame) {
				for (const shapeId of createdShapeIds) {
					const shape = editor.getShape(shapeId)
					if (shape) {
						const bounds = editor.getShapePageBounds(shape)
						if (bounds) {
							minPageX = Math.min(minPageX, bounds.x)
							minPageY = Math.min(minPageY, bounds.y)
						}
					}
				}
				console.log('Calculated bounds for update - minPageX:', minPageX, 'minPageY:', minPageY)
			}

			// Update all created shapes to link back to code block
			for (const shapeId of createdShapeIds) {
				const shape = editor.getShape(shapeId)
				if (shape) {
					const updates: any = {
						id: shapeId,
						type: shape.type,
						meta: {
							...shape.meta,
							codeBlockId,
						},
					}

					// If there's an existing frame, move shapes into it
					if (existingFrameId && existingFrame) {
						const bounds = editor.getShapePageBounds(shape)
						if (bounds) {
							// Position shapes so leftmost/topmost starts at (10, 10) inside frame
							const padding = 10
							updates.parentId = existingFrameId
							updates.x = bounds.x - minPageX + padding
							updates.y = bounds.y - minPageY + padding

							console.log('Positioned shape in frame:', shapeId, 'at', updates.x, updates.y)
						}
					} else {
						console.log('Created shape (no frame):', shapeId)
					}

					editor.updateShape(updates)
				}
			}

			// Update code block to store linked shape IDs
			const codeBlock = editor.getShape(codeBlockId)
			if (codeBlock) {
				editor.updateShape({
					id: codeBlockId,
					type: codeBlock.type,
					meta: {
						...codeBlock.meta,
						linkedShapeIds: createdShapeIds,
					},
				})
			}

			// Only create/update frame if there wasn't an existing frame
			// (if existingFrameId exists, shapes are already inside it)
			if (!existingFrameId) {
				console.log('Creating new link frame for shapes:', createdShapeIds)
				const frameId = createOrUpdateLinkFrame(editor, createdShapeIds, codeBlockId)
				console.log('Created frame:', frameId)
			} else {
				// Update the existing frame's size to fit new shapes
				const frame = editor.getShape(existingFrameId)
				if (frame && frame.type === 'frame') {
					// Get bounds of shapes inside the frame (they have page coordinates still)
					const childShapes = createdShapeIds.map((id) => editor.getShape(id)).filter(Boolean)
					if (childShapes.length > 0) {
						// Calculate page bounds
						const pageBounds = childShapes.map((s) => editor.getShapePageBounds(s)).filter(Boolean)
						let minX = Infinity,
							minY = Infinity,
							maxX = -Infinity,
							maxY = -Infinity
						for (const b of pageBounds) {
							minX = Math.min(minX, b.x)
							minY = Math.min(minY, b.y)
							maxX = Math.max(maxX, b.maxX)
							maxY = Math.max(maxY, b.maxY)
						}

						const padding = 20
						// Update frame position and size to encompass all shapes
						editor.updateShape({
							id: existingFrameId,
							type: 'frame',
							x: minX - padding,
							y: minY - padding,
							props: {
								w: maxX - minX + padding * 2,
								h: maxY - minY + padding * 2,
							},
						})

						console.log('Updated frame bounds:', {
							x: minX - padding,
							y: minY - padding,
							w: maxX - minX + padding * 2,
							h: maxY - minY + padding * 2,
						})
					}
				}
			}
		}

		return createdShapeIds
	} catch (error) {
		logger.error('convertCodeToShapes', error)
		throw error
	}
}
