import {
	type Editor,
	type TLArrowBinding,
	type TLArrowShape,
	type TLRichText,
	renderPlaintextFromRichText,
} from 'tldraw'
import { CUSTOM_SHAPE_TYPE, type ICustomShape } from './customMermaidShapeUtil'

/**
 * Serializes the current page's `flowchart-util` shapes and arrow bindings back into a Mermaid
 * `flowchart LR` source string. Shapes that came from a Mermaid import keep their original
 * `mermaidNodeId`; shapes added on the canvas without one get a generated `n#` id. Arrows that
 * are not bound to two `flowchart-util` shapes are ignored (matching `extractFlowchartPipelineFromEditor`).
 */
export function editorToFlowchartMermaid(editor: Editor): string {
	const pageShapes = editor.getCurrentPageShapes()

	const flowchartShapes: ICustomShape[] = []
	for (const shape of pageShapes) {
		if (shape.type === CUSTOM_SHAPE_TYPE) flowchartShapes.push(shape as ICustomShape)
	}

	const usedMermaidIds = new Set<string>()
	for (const shape of flowchartShapes) {
		const id = shape.props.mermaidNodeId
		if (id) usedMermaidIds.add(id)
	}

	let generatedCounter = 1
	const generateMermaidId = (): string => {
		while (true) {
			const candidate = `n${generatedCounter++}`
			if (!usedMermaidIds.has(candidate)) {
				usedMermaidIds.add(candidate)
				return candidate
			}
		}
	}

	const mermaidIdByShapeId = new Map<string, string>()
	const labelByMermaidId = new Map<string, string>()
	// Sort by Kahn step then top-to-bottom/left-to-right for deterministic, readable output.
	const orderedShapes = [...flowchartShapes].sort((a, b) => {
		const stepDiff = (a.props.pipelineStepIndex ?? 0) - (b.props.pipelineStepIndex ?? 0)
		if (stepDiff !== 0) return stepDiff
		if (a.y !== b.y) return a.y - b.y
		return a.x - b.x
	})

	for (const shape of orderedShapes) {
		const mermaidId = shape.props.mermaidNodeId || generateMermaidId()
		mermaidIdByShapeId.set(shape.id, mermaidId)
		const label = renderPlaintextFromRichText(editor, shape.props.richText as TLRichText).trim()
		labelByMermaidId.set(mermaidId, label)
	}

	interface Edge {
		from: string
		to: string
		label: string
	}
	const edges: Edge[] = []
	const seenEdgeKeys = new Set<string>()

	for (const shape of pageShapes) {
		if (shape.type !== 'arrow') continue
		const arrow = shape as TLArrowShape
		const bindings = editor.getBindingsInvolvingShape(arrow.id, 'arrow') as TLArrowBinding[]
		let startShapeId: string | undefined
		let endShapeId: string | undefined
		for (const binding of bindings) {
			if (binding.fromId !== arrow.id) continue
			if (binding.props.terminal === 'start') startShapeId = binding.toId
			else if (binding.props.terminal === 'end') endShapeId = binding.toId
		}
		if (!startShapeId || !endShapeId) continue
		const from = mermaidIdByShapeId.get(startShapeId)
		const to = mermaidIdByShapeId.get(endShapeId)
		if (!from || !to) continue
		const label = renderPlaintextFromRichText(editor, arrow.props.richText as TLRichText).trim()
		const key = `${from}->${to}#${label}`
		if (seenEdgeKeys.has(key)) continue
		seenEdgeKeys.add(key)
		edges.push({ from, to, label })
	}

	edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))

	const lines: string[] = ['flowchart LR']
	const writtenNodeIds = new Set<string>()

	const renderNodeRef = (mermaidId: string): string => {
		if (writtenNodeIds.has(mermaidId)) return mermaidId
		writtenNodeIds.add(mermaidId)
		const label = labelByMermaidId.get(mermaidId) ?? ''
		// Use the bare id (no `[]`) when there is no meaningful label — Mermaid will still
		// render the node, and the source stays tidy.
		if (!label) return mermaidId
		return `${mermaidId}[${formatNodeLabel(label)}]`
	}

	for (const edge of edges) {
		const fromRef = renderNodeRef(edge.from)
		const toRef = renderNodeRef(edge.to)
		if (edge.label) {
			lines.push(`  ${fromRef} -->|${formatEdgeLabel(edge.label)}| ${toRef}`)
		} else {
			lines.push(`  ${fromRef} --> ${toRef}`)
		}
	}

	for (const mermaidId of [...labelByMermaidId.keys()].sort()) {
		if (writtenNodeIds.has(mermaidId)) continue
		lines.push(`  ${renderNodeRef(mermaidId)}`)
	}

	return lines.join('\n')
}

const SAFE_BARE_NODE_LABEL = /^[A-Za-z0-9 _.,:;!?\-+/*=]+$/

/**
 * Mermaid node labels support either a bare `[Text]` form (with a restricted character set) or
 * a quoted `["Text"]` form that accepts richer content via HTML entities. Pick the quoted form
 * whenever the label could otherwise terminate the bracket / collide with Mermaid syntax.
 */
function formatNodeLabel(label: string): string {
	if (SAFE_BARE_NODE_LABEL.test(label)) return label
	const escaped = label.replace(/"/g, '&quot;').replace(/\n/g, '<br/>')
	return `"${escaped}"`
}

/** Edge labels in the `|...|` form: escape the pipe and newlines so Mermaid can still parse it. */
function formatEdgeLabel(label: string): string {
	return label.replace(/\|/g, '&#124;').replace(/\n/g, ' ')
}
