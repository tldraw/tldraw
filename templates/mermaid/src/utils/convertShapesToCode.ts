/**
 * Convert tldraw shapes to Mermaid code deterministically
 */

import { Editor, TLArrowShape, TLGeoShape, TLShape } from 'tldraw'
import { generateClassDiagramCode } from './generateClassDiagramCode'
import { logger } from './logger'
import type { ClassDefinition, ClassRelationship } from './parseClassDiagramAdvanced'

/**
 * Convert selected shapes to Mermaid code deterministically
 * @returns The code block ID (either updated or newly created)
 */
export async function convertShapesToCode(
	editor: Editor,
	shapeIds: string[]
): Promise<{ code: string; codeBlockId: string }> {
	// If a link frame is selected, get its children shapes instead
	let shapesToConvert: string[] = []
	for (const id of shapeIds) {
		const shape = editor.getShape(id)
		if (shape?.type === 'frame' && shape.meta?.isLinkFrame) {
			// Get all children of the frame
			const children = editor.getSortedChildIdsForParent(id)
			shapesToConvert.push(...children)
			console.log('Link frame selected, using', children.length, 'children shapes')
		} else {
			shapesToConvert.push(id)
		}
	}

	// Filter out code block shapes
	const filteredShapeIds = shapesToConvert.filter((id) => {
		const shape = editor.getShape(id)
		return shape && shape.type !== 'code-block'
	})

	if (filteredShapeIds.length === 0) {
		throw new Error('No diagram shapes selected (code blocks are excluded)')
	}

	logger.shapesToCode(filteredShapeIds.length)

	try {
		// Separate geo shapes (nodes) and arrow shapes (edges)
		const geoShapes: TLGeoShape[] = []
		const arrowShapes: TLArrowShape[] = []

		for (const id of filteredShapeIds) {
			const shape = editor.getShape(id) as TLShape
			if (shape?.type === 'geo') {
				geoShapes.push(shape as TLGeoShape)
			} else if (shape?.type === 'arrow') {
				arrowShapes.push(shape as TLArrowShape)
			}
		}

		if (geoShapes.length === 0) {
			throw new Error('No nodes found to convert')
		}

		console.log('Converting', geoShapes.length, 'nodes and', arrowShapes.length, 'arrows')

		// Detect diagram type from shape metadata (preserves original diagram type)
		let diagramType = 'flowchart'
		for (const shape of geoShapes) {
			if (shape.meta?.diagramType) {
				diagramType = shape.meta.diagramType as string
				console.log('Detected stored diagram type:', diagramType)
				break
			}
		}

		// Handle class diagrams specially - reconstruct from metadata
		if (diagramType === 'classDiagram') {
			const classes: ClassDefinition[] = []
			const relationships: ClassRelationship[] = []
			const classMap = new Map<string, ClassDefinition>()

			// Reconstruct classes from shape metadata
			for (const shape of geoShapes) {
				if (shape.meta?.classData) {
					const classData = shape.meta.classData as ClassDefinition
					classes.push(classData)
					classMap.set(classData.name, classData)
				}
			}

			// Reconstruct relationships from arrow metadata
			for (const arrow of arrowShapes) {
				if (arrow.meta?.relationshipData) {
					const relData = arrow.meta.relationshipData as ClassRelationship
					relationships.push(relData)
				}
			}

			// If we have class metadata, generate proper class diagram code
			if (classes.length > 0) {
				const code = generateClassDiagramCode(classes, relationships)
				console.log('Generated class diagram code:', code)

				// Find linked code block and return
				let linkedCodeBlockId: string | null = null
				for (const shapeId of filteredShapeIds) {
					const shape = editor.getShape(shapeId)
					if (shape?.type === 'frame' && shape.meta?.isLinkFrame && shape.meta?.linkedCodeBlockId) {
						linkedCodeBlockId = shape.meta.linkedCodeBlockId as string
						break
					}
					if (shape?.meta?.codeBlockId) {
						linkedCodeBlockId = shape.meta.codeBlockId as string
						break
					}
				}

				if (linkedCodeBlockId && editor.getShape(linkedCodeBlockId)) {
					const codeBlock = editor.getShape(linkedCodeBlockId)
					editor.updateShape({
						id: linkedCodeBlockId,
						type: codeBlock!.type,
						props: {
							code,
						},
					})
					logger.success(`Updated linked code block ${linkedCodeBlockId}`)
					return { code, codeBlockId: linkedCodeBlockId }
				}

				return { code, codeBlockId: '' }
			}

			// No metadata available - fall through to flowchart-style generation
			console.warn('Class diagram shapes missing metadata, generating flowchart-style code')
		}

		// Create node ID map (assign simple IDs like A, B, C)
		const nodeIdMap = new Map<string, string>()
		const nodeLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
		geoShapes.forEach((shape, index) => {
			const nodeId = index < 26 ? nodeLetters[index] : `Node${index + 1}`
			nodeIdMap.set(shape.id, nodeId)
		})

		// Infer diagram direction from node positions
		const direction = inferDirection(geoShapes)

		// Generate Mermaid code based on diagram type
		const lines: string[] = [diagramType === 'flowchart' ? `flowchart ${direction}` : diagramType]

		// Generate edges from arrow bindings
		const edgeLines = new Set<string>()
		const nodesUsedInEdges = new Set<string>()

		for (const arrow of arrowShapes) {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			if (bindings.length >= 2) {
				const startBinding = bindings.find((b) => b.props.terminal === 'start')
				const endBinding = bindings.find((b) => b.props.terminal === 'end')

				if (startBinding && endBinding) {
					const fromShapeId = startBinding.toId
					const toShapeId = endBinding.toId

					const fromNodeId = nodeIdMap.get(fromShapeId)
					const toNodeId = nodeIdMap.get(toShapeId)

					if (!fromNodeId) {
						console.warn('Arrow missing fromNodeId:', arrow.id, 'fromShape:', fromShapeId)
					}
					if (!toNodeId) {
						console.warn('Arrow missing toNodeId:', arrow.id, 'toShape:', toShapeId)
					}

					if (fromNodeId && toNodeId) {
						const fromShape = editor.getShape(fromShapeId) as TLGeoShape
						const toShape = editor.getShape(toShapeId) as TLGeoShape

						// Get node definitions
						const fromDef = getNodeDefinition(
							fromNodeId,
							fromShape,
							!nodesUsedInEdges.has(fromShapeId)
						)
						const toDef = getNodeDefinition(toNodeId, toShape, !nodesUsedInEdges.has(toShapeId))

						nodesUsedInEdges.add(fromShapeId)
						nodesUsedInEdges.add(toShapeId)

						// Build arrow syntax from arrowhead styles and dash style
						let arrowSyntax = ''

						// Start arrowhead
						if (arrow.props.arrowheadStart === 'arrow') {
							arrowSyntax = '<'
						} else if (arrow.props.arrowheadStart === 'dot') {
							arrowSyntax = 'o'
						} else if (
							arrow.props.arrowheadStart === 'bar' ||
							arrow.props.arrowheadStart === 'diamond'
						) {
							arrowSyntax = 'x'
						}

						// Line style
						if (arrow.props.dash === 'dotted') {
							arrowSyntax += '-.-'
						} else if (arrow.props.dash === 'dashed') {
							arrowSyntax += '=='
						} else {
							arrowSyntax += '--'
						}

						// End arrowhead
						if (arrow.props.arrowheadEnd === 'arrow') {
							arrowSyntax += '>'
						} else if (arrow.props.arrowheadEnd === 'dot') {
							arrowSyntax += 'o'
						} else if (
							arrow.props.arrowheadEnd === 'bar' ||
							arrow.props.arrowheadEnd === 'diamond'
						) {
							arrowSyntax += 'x'
						} else {
							arrowSyntax += '-'
						}

						// Extract label from arrow richText
						let arrowLabelText = ''
						if (arrow.props.richText && arrow.props.richText.length > 0) {
							arrowLabelText = arrow.props.richText.map((segment) => segment.text).join('')
						}
						const arrowLabel = arrowLabelText ? `|${arrowLabelText}|` : ''
						edgeLines.add(`${fromDef} ${arrowSyntax}${arrowLabel} ${toDef}`)
					}
				}
			}
		}

		lines.push(...Array.from(edgeLines))

		// Add standalone nodes (not connected by any arrows)
		for (const shape of geoShapes) {
			if (!nodesUsedInEdges.has(shape.id)) {
				const nodeId = nodeIdMap.get(shape.id)!
				lines.push(getNodeDefinition(nodeId, shape, true))
			}
		}

		const code = lines.join('\n')
		console.log('Generated Mermaid code:', code)

		// Check if any of the shapes are linked to a code block
		let linkedCodeBlockId: string | null = null
		for (const shapeId of filteredShapeIds) {
			const shape = editor.getShape(shapeId)
			console.log('Checking shape for link:', shapeId, 'type:', shape?.type, 'meta:', shape?.meta)

			// If this is a link frame, use its linkedCodeBlockId
			if (shape?.type === 'frame' && shape.meta?.isLinkFrame && shape.meta?.linkedCodeBlockId) {
				linkedCodeBlockId = shape.meta.linkedCodeBlockId as string
				console.log('Found link frame, linked to code block:', linkedCodeBlockId)
				break
			}

			// Otherwise check for codeBlockId on the shape itself
			if (shape?.meta?.codeBlockId) {
				linkedCodeBlockId = shape.meta.codeBlockId as string
				console.log('Found linked code block via codeBlockId:', linkedCodeBlockId)
				break
			}
		}
		console.log('Final linked code block ID:', linkedCodeBlockId)

		// If linked to an existing code block, update it
		if (linkedCodeBlockId && editor.getShape(linkedCodeBlockId)) {
			const codeBlock = editor.getShape(linkedCodeBlockId)
			editor.updateShape({
				id: linkedCodeBlockId,
				type: codeBlock!.type,
				props: {
					code,
				},
			})
			logger.success(`Updated linked code block ${linkedCodeBlockId}`)
			return { code, codeBlockId: linkedCodeBlockId }
		}

		// Otherwise return the code to create a new code block
		return { code, codeBlockId: '' }
	} catch (error) {
		logger.error('convertShapesToCode', error)
		throw error
	}
}

/**
 * Infer diagram direction from node positions
 */
function inferDirection(shapes: TLGeoShape[]): 'LR' | 'RL' | 'TB' | 'BT' {
	if (shapes.length < 2) return 'LR'

	// Calculate average horizontal and vertical spacing
	let totalDx = 0
	let totalDy = 0
	let count = 0

	for (let i = 0; i < shapes.length; i++) {
		for (let j = i + 1; j < shapes.length; j++) {
			const dx = shapes[j].x - shapes[i].x
			const dy = shapes[j].y - shapes[i].y
			totalDx += Math.abs(dx)
			totalDy += Math.abs(dy)
			count++
		}
	}

	const avgDx = totalDx / count
	const avgDy = totalDy / count

	// If more horizontal than vertical, use LR/RL, otherwise use TB/BT
	if (avgDx > avgDy) {
		return 'LR' // Default to left-to-right for horizontal layouts
	} else {
		return 'TB' // Default to top-to-bottom for vertical layouts
	}
}

/**
 * Get Mermaid node definition from tldraw geo shape
 */
function getNodeDefinition(nodeId: string, shape: TLGeoShape, includeLabel: boolean): string {
	// Extract plain text from richText
	let label = nodeId
	if (shape.props.richText && shape.props.richText.length > 0) {
		label = shape.props.richText.map((segment) => segment.text).join('')
	}
	if (!label) label = nodeId

	if (!includeLabel) {
		return nodeId
	}

	// Map geo types to Mermaid syntax
	switch (shape.props.geo) {
		case 'rectangle':
			return `${nodeId}[${label}]`
		case 'diamond':
			return `${nodeId}{${label}}`
		case 'ellipse':
			return `${nodeId}((${label}))`
		case 'oval':
			return `${nodeId}(${label})`
		case 'hexagon':
			return `${nodeId}{{${label}}}`
		case 'trapezoid':
			return `${nodeId}[/${label}\\]`
		case 'rhombus':
		case 'rhombus-2':
			return `${nodeId}[/${label}/]` // Parallelogram syntax
		case 'arrow-right':
		case 'arrow-left':
		case 'arrow-up':
		case 'arrow-down':
			return `${nodeId}>${label}]` // Flag syntax
		case 'pentagon':
		case 'octagon':
		case 'star':
		case 'cloud':
		case 'x-box':
		case 'triangle':
			// These don't have direct Mermaid equivalents, use rectangle
			return `${nodeId}[${label}]`
		default:
			return `${nodeId}[${label}]`
	}
}
