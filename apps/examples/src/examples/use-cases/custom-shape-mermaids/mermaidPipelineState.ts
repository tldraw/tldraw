import { atom } from '@tldraw/state'
import { predecessorsFromEdges } from './pipelineGraph'

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed'

export interface PipelineState {
	nodeIds: string[]
	edges: [string, string][]
	statusByNodeId: Record<string, StepStatus>
	parseError: string | null
	isRunning: boolean
}

/**
 * One shared atom for the whole page: every `flowchart-util` instance subscribes with `useValue`,
 * which is why this cannot live inside `useAtom` per component (each mount would get its own atom).
 */
export const pipelineStateAtom = atom<PipelineState>('mermaidPipelineExample', {
	nodeIds: [],
	edges: [],
	statusByNodeId: {},
	parseError: null,
	isRunning: false,
})

/** Probability each simulated step ends in `failed` (0–1). */
const FAIL_PROBABILITY = 0.2

const STEP_DELAY_MS_MIN = 800
const STEP_DELAY_MS_EXTRA = 400

function delay(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Runs one simulated step. Returns false if the step failed (pipeline should stop or wait for Retry). */
async function simulateStep(nodeId: string): Promise<boolean> {
	pipelineStateAtom.update((s) => ({
		...s,
		statusByNodeId: { ...s.statusByNodeId, [nodeId]: 'running' },
	}))
	await delay(STEP_DELAY_MS_MIN + Math.random() * STEP_DELAY_MS_EXTRA)
	const failed = Math.random() < FAIL_PROBABILITY
	pipelineStateAtom.update((s) => ({
		...s,
		statusByNodeId: { ...s.statusByNodeId, [nodeId]: failed ? 'failed' : 'passed' },
	}))
	return !failed
}

function getReadyNodeIds(
	nodeIds: string[],
	edges: [string, string][],
	statusByNodeId: Record<string, StepStatus>
): string[] {
	const preds = predecessorsFromEdges(edges)
	return nodeIds.filter((id) => {
		if (statusByNodeId[id] !== 'pending') return false
		const ps = preds.get(id) ?? []
		return ps.every((p) => statusByNodeId[p] === 'passed')
	})
}

/**
 * Runs pending steps in AND-join order until all pass, fail, or execution is blocked by a failure.
 */
async function drainPipelineSteps() {
	while (true) {
		const s = pipelineStateAtom.get()
		const { nodeIds, edges, statusByNodeId } = s

		const pending = nodeIds.filter((id) => statusByNodeId[id] === 'pending')
		if (pending.length === 0) {
			break
		}

		const ready = getReadyNodeIds(nodeIds, edges, statusByNodeId)
		if (ready.length === 0) {
			break
		}

		ready.sort()
		for (const id of ready) {
			const ok = await simulateStep(id)
			if (!ok) {
				return
			}
		}
	}
}

/** Resets every step to pending, then runs until a failure or completion. */
export async function runFullPipeline() {
	const s = pipelineStateAtom.get()
	if (s.isRunning || s.nodeIds.length === 0 || s.parseError) return

	pipelineStateAtom.update((prev) => ({
		...prev,
		isRunning: true,
		statusByNodeId: Object.fromEntries(
			prev.nodeIds.map((id) => [id, 'pending' as const])
		) as Record<string, StepStatus>,
	}))

	await drainPipelineSteps()
	pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
}

/** Re-runs a failed step, then continues scheduling from current graph state. */
export async function retryPipelineFromNode(nodeId: string) {
	const s = pipelineStateAtom.get()
	if (s.isRunning || s.statusByNodeId[nodeId] !== 'failed') return
	if (!s.nodeIds.includes(nodeId)) return

	pipelineStateAtom.update((p) => ({ ...p, isRunning: true }))

	const ok = await simulateStep(nodeId)
	if (!ok) {
		pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
		return
	}

	await drainPipelineSteps()
	pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
}
