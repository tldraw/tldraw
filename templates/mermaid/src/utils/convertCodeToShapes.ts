/**
 * Convert Mermaid code to tldraw shapes
 */

import {
	Box,
	createBindingId,
	createShapeId,
	Editor,
	TLArrowShape,
	TLGeoShape,
	TLShape,
	TLShapeId,
	toRichText,
	Vec,
} from 'tldraw'
import { hasOverlaps, resolveShapeOverlaps } from './cleanupDiagram'
import { createOrUpdateLinkFrame } from './createLinkFrame'
import { logger } from './logger'
import { getMermaidLayout } from './mermaid/index'
import { DiagramLayout } from './mermaid/types'
import { extractMermaidCode, getDiagramType } from './mermaidDetection'
import { renderMermaidToSvg } from './renderMermaidToSvg'
import { lineStyleToDash } from './shapeReaders/propertyMappings'

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
		const codeBlock = editor.getShape(codeBlockId as TLShapeId)
		if (codeBlock && codeBlock.meta.linkedShapeIds) {
			oldShapeIds = (codeBlock.meta.linkedShapeIds as string[]).filter((id) => editor.getShape(id as TLShapeId))
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

			// Delete all children of the frame (more robust than relying on linkedShapeIds)
			const childrenIds = editor.getSortedChildIdsForParent(existingFrame.id)
			if (childrenIds.length > 0) {
				console.log('Deleting', childrenIds.length, 'shapes from existing frame')
				editor.deleteShapes(childrenIds)
			}

			// Also try deleting from linkedShapeIds if available (backup)
			if (oldShapeIds.length > 0) {
				const remainingIds = oldShapeIds.filter((id) => editor.getShape(id as TLShapeId))
				if (remainingIds.length > 0) {
					console.log('Deleting remaining old shapes:', remainingIds)
					editor.deleteShapes(remainingIds as TLShapeId[])
				}
			}
		} else {
			console.log('No existing frame found')
		}
	}

	// Track shapes before creation
	const shapeIdsBefore = new Set(editor.getCurrentPageShapeIds())

	try {
		const nativeTypes = [
			'flowchart',
			'sequenceDiagram',
			'classDiagram',
			'stateDiagram',
			'erDiagram',
		]

		if (nativeTypes.includes(diagramType)) {
			// Use Mermaid SVG layout for native types
			logger.parsing(diagramType, extractedCode)
			const layout = await getMermaidLayout(extractedCode)
			if (layout) {
				createShapesFromLayout(editor, layout, position)
				logger.success(`${diagramType} shapes created from SVG layout`)
			} else {
				throw new Error(`Could not extract layout for diagram type: ${diagramType}`)
			}
		} else {
			// Fall back to SVG rendering for unsupported diagram types
			logger.parsing('SVG fallback', extractedCode)
			const result = await renderMermaidToSvg(extractedCode)

			if (!result) {
				throw new Error('Could not render diagram to SVG')
			}

			// Convert SVG string to data URL
			const svgDataUrl = `data:image/svg+xml;base64,${btoa(result.svg)}`

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
					w: result.width,
					h: result.height,
				},
			})
			logger.success(`${diagramType} rendered as SVG image`)
		}

		// Get shapes that were created
		const shapeIdsAfter = Array.from(editor.getCurrentPageShapeIds())
		const createdShapeIds = shapeIdsAfter.filter((id) => !shapeIdsBefore.has(id))

		console.log('Created shape IDs:', createdShapeIds)

		// Resolve overlapping shapes if any exist
		if (createdShapeIds.length >= 2 && hasOverlaps(editor, createdShapeIds)) {
			console.log('Resolving shape overlaps...')
			resolveShapeOverlaps(editor, createdShapeIds)
		}

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
							diagramType, // Store diagram type on each shape for round-trip conversion
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

			// Update code block to store linked shape IDs and diagram type
			const codeBlock = editor.getShape(codeBlockId as TLShapeId)
			if (codeBlock) {
				editor.updateShape({
					id: codeBlockId as TLShapeId,
					type: codeBlock.type,
					meta: {
						...codeBlock.meta,
						linkedShapeIds: createdShapeIds,
						diagramType: diagramType, // Store the diagram type for round-trip conversion
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
				const frame = editor.getShape(existingFrameId as TLShapeId)
				if (frame && frame.type === 'frame') {
					// Get bounds of shapes inside the frame (they have page coordinates still)
					const childShapes = createdShapeIds.map((id) => editor.getShape(id)).filter((s): s is TLShape => s != null)
					if (childShapes.length > 0) {
						// Calculate page bounds
						const pageBounds = childShapes.map((s) => editor.getShapePageBounds(s)).filter((b): b is Box => b != null)
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
							id: existingFrameId as TLShapeId,
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

/** Strip undefined/non-serializable values so tldraw's store validation passes */
function sanitizeMeta(meta: Record<string, unknown>): any {
	return JSON.parse(JSON.stringify(meta))
}

function createShapesFromLayout(editor: Editor, layout: DiagramLayout, position: Vec): void {
	const shapeIdMap = new Map<string, string>() // nodeId -> tldraw shapeId

	// Choose default color based on diagram type
	// Flowcharts use black so per-edge styling stands out
	const colorMap: Record<string, string> = {
		flowchart: 'black',
		sequenceDiagram: 'light-blue',
		classDiagram: 'violet',
		stateDiagram: 'light-green',
		erDiagram: 'blue',
	}
	const color = colorMap[layout.type] ?? 'black'

	// Create all node shapes first
	for (const node of layout.nodes) {
		const shapeId = createShapeId()
		shapeIdMap.set(node.id, shapeId as string)

		// Build the richText label
		const richText = toRichText(node.label)

		// Special handling for start/end state markers
		const stateData = node.meta.stateData as any
		const isStartMarker = stateData?.isStart === true
		const isEndMarker = stateData?.isEnd === true

		// Add padding so tldraw's font rendering doesn't overflow Mermaid's layout dimensions
		const PAD_W = isStartMarker || isEndMarker ? 0 : 24
		const PAD_H = isStartMarker || isEndMarker ? 0 : 16

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: position.x + node.x - PAD_W / 2,
			y: position.y + node.y - PAD_H / 2,
			props: {
				geo: node.geoShape as any,
				w: Math.max(node.width + PAD_W, 60),
				h: Math.max(node.height + PAD_H, 40),
				richText,
				align: 'middle',
				verticalAlign: 'middle',
				dash: 'solid',
				color: isStartMarker ? 'black' : isEndMarker ? 'black' : (color as any),
				fill: isStartMarker ? 'solid' : 'none',
			},
			meta: sanitizeMeta({
				...node.meta,
				diagramType: layout.type,
			}),
		})
	}

	// Create arrow shapes with proper bindings second
	for (const edge of layout.edges) {
		const meta = edge.meta as any

		// Skip lifelines — they are rendered as decorative arrow shapes without bindings
		if (meta.isLifeline === true) {
			const lifelineId = createShapeId()
			editor.createShape<TLArrowShape>({
				id: lifelineId,
				type: 'arrow',
				x: position.x + (meta.lifelineX ?? 0),
				y: position.y + (meta.lifelineStartY ?? 0),
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: (meta.lifelineEndY ?? 0) - (meta.lifelineStartY ?? 0) || 100 },
					arrowheadStart: 'none',
					arrowheadEnd: 'none',
					dash: 'dashed',
					richText: toRichText(''),
				},
				meta: sanitizeMeta({
					...edge.meta,
					diagramType: layout.type,
					isLifeline: true,
				}),
			})
			continue
		}

		const fromShapeId = shapeIdMap.get(edge.from)
		const toShapeId = shapeIdMap.get(edge.to)
		if (!fromShapeId || !toShapeId) continue

		const arrowId = createShapeId()

		// Determine arrow style from per-edge metadata
		let dash: 'draw' | 'solid' | 'dashed' | 'dotted' = 'solid'
		let arrowheadEnd: string = 'arrow'
		let arrowheadStart: string = 'none'
		let arrowColor: string | undefined

		if (layout.type === 'flowchart') {
			// Per-edge styles from parsed flowchart AST
			// lineStyle is Mermaid's: 'solid' | 'dotted' | 'thick'
			const lineStyle = meta.lineStyle as string | undefined
			dash = lineStyleToDash(lineStyle ?? 'solid')

			const arrowType = meta.arrowType as string | undefined
			if (arrowType === 'none') arrowheadEnd = 'none'
			else if (arrowType === 'dot') arrowheadEnd = 'dot'
			else if (arrowType === 'bar' || arrowType === 'diamond') arrowheadEnd = arrowType
			else arrowheadEnd = 'arrow'

			const startArrowType = meta.arrowStartType as string | undefined
			if (startArrowType === 'arrow') arrowheadStart = 'arrow'
			else if (startArrowType === 'dot') arrowheadStart = 'dot'
			else if (startArrowType === 'bar') arrowheadStart = 'bar'

			if (meta.edgeColor) arrowColor = meta.edgeColor as string
		} else if (layout.type === 'sequenceDiagram') {
			const msgData = meta.messageData
			if (msgData?.messageType === 'dotted') dash = 'dashed'
			if (msgData?.arrowType === 'cross') {
				arrowheadEnd = 'none'
				dash = 'solid'
			} else if (msgData?.arrowType === 'open') {
				arrowheadEnd = 'arrow'
			} else {
				arrowheadEnd = 'arrow'
			}
		} else if (layout.type === 'erDiagram') {
			const relData = meta.relationshipData
			dash = relData?.relType === 'identifying' ? 'solid' : 'dashed'
		} else if (layout.type === 'classDiagram') {
			const relData = meta.relationshipData
			if (relData) {
				if (relData.type === 'inheritance') {
					arrowheadEnd = 'arrow'
					dash = 'solid'
				} else if (relData.type === 'implementation') {
					arrowheadEnd = 'arrow'
					dash = 'dashed'
				} else if (relData.type === 'composition') {
					arrowheadEnd = 'diamond'
					dash = 'solid'
				} else if (relData.type === 'aggregation') {
					arrowheadEnd = 'diamond'
					dash = 'dashed'
				} else {
					arrowheadEnd = 'arrow'
				}
			}
		}

		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 0 },
				arrowheadStart: arrowheadStart as any,
				arrowheadEnd: arrowheadEnd as any,
				dash,
				...(arrowColor ? { color: arrowColor as any } : {}),
				richText: toRichText(edge.label),
			},
			meta: sanitizeMeta({
				...edge.meta,
				diagramType: layout.type,
			}),
		})

		editor.createBinding({
			id: createBindingId(),
			type: 'arrow',
			fromId: arrowId,
			toId: fromShapeId as any,
			props: {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: false,
				isExact: false,
			},
		})

		editor.createBinding({
			id: createBindingId(),
			type: 'arrow',
			fromId: arrowId,
			toId: toShapeId as any,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: false,
				isExact: false,
			},
		})
	}
}
