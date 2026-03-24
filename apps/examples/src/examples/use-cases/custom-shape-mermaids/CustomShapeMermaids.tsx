/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Mermaid → linear pipeline demo: paste flowchart source, apply to the canvas, run simulated steps.
 * - `mapNodeToRenderSpec` maps each vertex to the custom `flowchart-util` type and `mermaidNodeId`.
 * - `blueprintRender.createShape` delegates to `defaultCreateMermaidNodeFromBlueprint`, then merges
 *   `pipelineStepIndex` from our parsed order (data Mermaid does not provide). Arrows still use the
 *   package-assigned `shapeId`.
 */
import { useCallback, useState } from 'react'
import { TLComponents, Tldraw, TldrawUiButton, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { FlowchartShapeUtil } from './customMermaidShapeUtil'
import './custom-shape-mermaid.css'
import {
	createPipelineNodeFromBlueprint,
	mapNodeToRenderSpec,
	setPipelineStepIndicesFromOrder,
} from './mermaidPipelineBlueprint'
import { type StepStatus, pipelineStateAtom, runFullPipeline } from './mermaidPipelineState'
import { parseLinearPipelineFromMermaid } from './pipelineFromMermaid'

const components: TLComponents = {
	TopPanel: TopPanel,
}

const customShapes = [FlowchartShapeUtil]

const DEFAULT_MERMAID = `flowchart LR
  s1[Checkout] --> s2[Build]
  s2 --> s3[Test]
  s3 --> s4[Deploy]`

export default function MermaidDiagramsCustomShapes() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} shapeUtils={customShapes} />
		</div>
	)
}

function TopPanel() {
	const editor = useEditor()
	const [mermaidText, setMermaidText] = useState(DEFAULT_MERMAID)
	const [isApplying, setIsApplying] = useState(false)
	const pipeline = useValue(pipelineStateAtom)

	const canRun =
		!pipeline.parseError && pipeline.orderedNodeIds.length > 0 && !pipeline.isRunning && !isApplying

	const applyWorkflow = useCallback(async () => {
		if (isApplying) return
		setIsApplying(true)

		try {
			const parsed = parseLinearPipelineFromMermaid(mermaidText)
			pipelineStateAtom.set({
				orderedNodeIds: parsed.ok ? parsed.order : [],
				statusByNodeId: parsed.ok
					? (Object.fromEntries(parsed.order.map((id) => [id, 'pending' as const])) as Record<
							string,
							StepStatus
						>)
					: {},
				parseError: parsed.ok ? null : parsed.error,
				isRunning: false,
			})

			setPipelineStepIndicesFromOrder(parsed.ok ? parsed.order : null)

			const [{ createMermaidDiagram }, { default: mermaid }] = await Promise.all([
				import('@tldraw/mermaid'),
				import('mermaid'),
			])
			mermaid.initialize({
				startOnLoad: false,
				flowchart: { useMaxWidth: false, nodeSpacing: 80, rankSpacing: 80, padding: 20 },
			})

			editor.selectAll()
			editor.deleteShapes(editor.getSelectedShapes())

			try {
				await createMermaidDiagram(editor, mermaidText, {
					blueprintRender: {
						position: { x: 200, y: 400 },
						centerOnPosition: false,
						createShape: createPipelineNodeFromBlueprint,
					},
					flowchart: { mapNodeToRenderSpec },
				})
			} catch {
				pipelineStateAtom.update((s) => ({
					...s,
					parseError: `An error occured please make sure your diagran is valid`,
				}))
			}

			editor.selectNone()
		} catch {
			pipelineStateAtom.update((s) => ({
				...s,
				parseError: `An error occured please make sure your diagran is valid`,
			}))
		} finally {
			setIsApplying(false)
		}
	}, [editor, isApplying, mermaidText])

	const runPipeline = useCallback(() => {
		void runFullPipeline()
	}, [])

	return (
		<div className="custom-shape-mermaid">
			<div>
				Paste a <strong>linear</strong> <code>flowchart</code> (one path, no branches). Apply loads
				it as actionable steps. <code>mapNodeToRenderSpec</code> picks the custom shape;
				<code>createShape</code> adds the step number from our parser. Run simulates each step;
				failures can be retried on the shape. Step status is only in memory for this demo.
			</div>
			<textarea
				value={mermaidText}
				onChange={(e) => setMermaidText(e.target.value)}
				rows={7}
				spellCheck={false}
				className="custom-shape-mermaid__textarea"
			/>
			{pipeline.parseError && (
				<div className="custom-shape-mermaid__error">{pipeline.parseError}</div>
			)}
			<div className="custom-shape-mermaid__controls">
				<TldrawUiButton type="normal" onClick={applyWorkflow} disabled={isApplying}>
					{isApplying ? 'Applying…' : 'Apply workflow'}
				</TldrawUiButton>
				<TldrawUiButton type="low" onClick={runPipeline} disabled={!canRun}>
					Run pipeline
				</TldrawUiButton>
			</div>
			{pipeline.isRunning && (
				<div className="custom-shape-mermaid__notice">Running simulated steps…</div>
			)}
		</div>
	)
}
