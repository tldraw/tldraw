import { atom } from '@tldraw/state'

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed'

export interface PipelineState {
	orderedNodeIds: string[]
	statusByNodeId: Record<string, StepStatus>
	parseError: string | null
	isRunning: boolean
}

/**
 * One shared atom for the whole page: every `flowchart-util` instance subscribes with `useValue`,
 * which is why this cannot live inside `useAtom` per component (each mount would get its own atom).
 */
export const pipelineStateAtom = atom<PipelineState>('mermaidPipelineExample', {
	orderedNodeIds: [],
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

/** Resets every step to pending, then runs in order until a failure or completion. */
export async function runFullPipeline() {
	const s = pipelineStateAtom.get()
	if (s.isRunning || s.orderedNodeIds.length === 0 || s.parseError) return

	pipelineStateAtom.update((prev) => ({
		...prev,
		isRunning: true,
		statusByNodeId: Object.fromEntries(
			prev.orderedNodeIds.map((id) => [id, 'pending' as const])
		) as Record<string, StepStatus>,
	}))

	const { orderedNodeIds } = pipelineStateAtom.get()
	for (const id of orderedNodeIds) {
		const ok = await simulateStep(id)
		if (!ok) {
			pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
			return
		}
	}
	pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
}

/** Re-runs a failed step, then continues with later steps if the retry succeeds. */
export async function retryPipelineFromNode(nodeId: string) {
	const s = pipelineStateAtom.get()
	if (s.isRunning || s.statusByNodeId[nodeId] !== 'failed') return

	const idx = s.orderedNodeIds.indexOf(nodeId)
	if (idx < 0) return

	pipelineStateAtom.update((p) => ({ ...p, isRunning: true }))

	const ok = await simulateStep(nodeId)
	if (!ok) {
		pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
		return
	}

	const { orderedNodeIds } = pipelineStateAtom.get()
	for (let j = idx + 1; j < orderedNodeIds.length; j++) {
		const ok2 = await simulateStep(orderedNodeIds[j])
		if (!ok2) {
			pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
			return
		}
	}
	pipelineStateAtom.update((p) => ({ ...p, isRunning: false }))
}
