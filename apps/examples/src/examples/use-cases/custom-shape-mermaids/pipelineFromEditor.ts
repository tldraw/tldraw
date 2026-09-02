import type { Editor, TLArrowBinding } from 'tldraw'
import { CUSTOM_SHAPE_TYPE, type ICustomShape } from './customMermaidShapeUtil'
import { flowchartPipelineFromEdges, type ParseFlowchartPipelineResult } from './pipelineGraph'

/**
 * Derives a DAG from imported Mermaid shapes: `flowchart-util` nodes (`mermaidNodeId`)
 * and `arrow` shapes with arrow bindings.
 */
export function extractFlowchartPipelineFromEditor(editor: Editor): ParseFlowchartPipelineResult {
	const shapes = editor.getCurrentPageShapes()
	const mermaidByShapeId = new Map<string, string>()
	for (const s of shapes) {
		if (s.type !== CUSTOM_SHAPE_TYPE) continue
		const props = (s as ICustomShape).props
		const mid = props.mermaidNodeId
		if (mid) mermaidByShapeId.set(s.id, mid)
	}

	const pairs: [string, string][] = []
	const seen = new Set<string>()

	for (const s of shapes) {
		if (s.type !== 'arrow') continue
		const bindings = editor.getBindingsInvolvingShape(s.id, 'arrow') as TLArrowBinding[]
		let startTarget: string | undefined
		let endTarget: string | undefined
		for (const b of bindings) {
			if (b.fromId !== s.id) continue
			const target = b.toId
			if (b.props.terminal === 'start') startTarget = target
			else if (b.props.terminal === 'end') endTarget = target
		}
		if (!startTarget || !endTarget) continue
		const a = mermaidByShapeId.get(startTarget)
		const b = mermaidByShapeId.get(endTarget)
		if (!a || !b) continue
		const key = `${a}->${b}`
		if (seen.has(key)) continue
		seen.add(key)
		pairs.push([a, b])
	}

	return flowchartPipelineFromEdges(pairs)
}

/** Sets `pipelineStepIndex` (Kahn layer, 1-based) on each `flowchart-util` shape; others get 0. */
export function applyPipelineStepIndices(
	editor: Editor,
	stepIndexByNodeId: Record<string, number>
) {
	const byMermaidId = new Map<string, ICustomShape>()
	for (const s of editor.getCurrentPageShapes()) {
		if (s.type !== CUSTOM_SHAPE_TYPE) continue
		const shape = s as ICustomShape
		const id = shape.props.mermaidNodeId
		if (id) byMermaidId.set(id, shape)
	}

	editor.run(() => {
		for (const [mermaidId, shape] of byMermaidId) {
			const step = stepIndexByNodeId[mermaidId] ?? 0
			editor.updateShape({
				id: shape.id,
				type: CUSTOM_SHAPE_TYPE,
				props: { ...shape.props, pipelineStepIndex: step },
			})
		}
	})
}
