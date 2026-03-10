/**
 * Convert tldraw shapes to Mermaid code.
 *
 * Architecture: shapes → detect type → read into AST → generate code string.
 * Each diagram type has a dedicated reader (shapes→AST) and generator (AST→string).
 */

import { Editor, TLArrowShape, TLGeoShape, TLShape, TLShapeId } from 'tldraw'
import {
	generateClassDiagramCode,
	generateErCode,
	generateFlowchartCode,
	generateSequenceCode,
	generateStateCode,
} from './codeGenerators'
import { logger } from './logger'
import {
	detectDiagramType,
	readClassDiagram,
	readErDiagram,
	readFlowchart,
	readSequenceDiagram,
	readStateDiagram,
} from './shapeReaders'

export async function convertShapesToCode(
	editor: Editor,
	shapeIds: string[]
): Promise<{ code: string; codeBlockId: string }> {
	// Resolve shape IDs: expand link frames, filter code blocks
	const filteredShapeIds = resolveShapeIds(editor, shapeIds)

	if (filteredShapeIds.length === 0) {
		throw new Error('No diagram shapes selected (code blocks are excluded)')
	}

	logger.shapesToCode(filteredShapeIds.length)

	// Separate geo shapes and arrow shapes
	const geoShapes: TLGeoShape[] = []
	const arrowShapes: TLArrowShape[] = []

	for (const id of filteredShapeIds) {
		const shape = editor.getShape(id as TLShapeId) as TLShape
		if (shape?.type === 'geo') geoShapes.push(shape as TLGeoShape)
		else if (shape?.type === 'arrow') arrowShapes.push(shape as TLArrowShape)
	}

	if (geoShapes.length === 0) {
		throw new Error('No nodes found to convert')
	}

	// Detect → Read → Generate
	const diagramType = detectDiagramType(editor, geoShapes, arrowShapes)
	const code = generateCode(editor, diagramType, geoShapes, arrowShapes)

	console.log('Generated Mermaid code:', code)

	// Update linked code block if one exists
	const linkedCodeBlockId = findLinkedCodeBlock(editor, filteredShapeIds)
	if (linkedCodeBlockId && editor.getShape(linkedCodeBlockId as TLShapeId)) {
		const codeBlock = editor.getShape(linkedCodeBlockId as TLShapeId)!
		editor.updateShape({
			id: linkedCodeBlockId as TLShapeId,
			type: codeBlock.type,
			props: { code },
		} as any)
		logger.success(`Updated linked code block ${linkedCodeBlockId}`)
		return { code, codeBlockId: linkedCodeBlockId }
	}

	return { code, codeBlockId: '' }
}

/**
 * Read shapes into an AST and generate Mermaid code for the given diagram type.
 */
function generateCode(
	editor: Editor,
	diagramType: string,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): string {
	switch (diagramType) {
		case 'flowchart': {
			const ast = readFlowchart(editor, geoShapes, arrowShapes)
			return generateFlowchartCode(ast)
		}
		case 'sequenceDiagram': {
			const ast = readSequenceDiagram(editor, geoShapes, arrowShapes)
			return generateSequenceCode(ast)
		}
		case 'stateDiagram': {
			const ast = readStateDiagram(editor, geoShapes, arrowShapes)
			return generateStateCode(ast)
		}
		case 'classDiagram': {
			const { classes, relationships } = readClassDiagram(editor, geoShapes, arrowShapes)
			return generateClassDiagramCode(classes, relationships)
		}
		case 'erDiagram': {
			const ast = readErDiagram(editor, geoShapes, arrowShapes)
			return generateErCode(ast)
		}
		default:
			// Unknown type: treat as flowchart
			return generateFlowchartCode(readFlowchart(editor, geoShapes, arrowShapes))
	}
}

/**
 * Expand link frames to their children and filter out code block shapes.
 */
function resolveShapeIds(editor: Editor, shapeIds: string[]): string[] {
	let shapesToConvert: string[] = []

	for (const id of shapeIds) {
		const shape = editor.getShape(id as TLShapeId)
		if (shape?.type === 'frame' && shape.meta?.isLinkFrame) {
			const children = editor.getSortedChildIdsForParent(id as TLShapeId)
			shapesToConvert.push(...children)
		} else {
			shapesToConvert.push(id)
		}
	}

	return shapesToConvert.filter((id) => {
		const shape = editor.getShape(id as TLShapeId)
		return shape && shape.type !== 'code-block'
	})
}

/**
 * Find a linked code block ID from the shape set.
 */
function findLinkedCodeBlock(editor: Editor, shapeIds: string[]): string | null {
	for (const shapeId of shapeIds) {
		const shape = editor.getShape(shapeId as TLShapeId)
		if (shape?.type === 'frame' && shape.meta?.isLinkFrame && shape.meta?.linkedCodeBlockId) {
			return shape.meta.linkedCodeBlockId as string
		}
		if (shape?.meta?.codeBlockId) {
			return shape.meta.codeBlockId as string
		}
	}
	return null
}
