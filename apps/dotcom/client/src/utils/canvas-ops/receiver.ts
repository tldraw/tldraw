import type { Editor } from 'tldraw'
import { applyOps } from './ops'
import { AttributionSchema, OpsBatchSchema, type ApplyOpsResult } from './schema'

/**
 * Receives canvas ops from an untrusted sender (a canvas agent, a socket, a postMessage) and
 * applies them to `editor`. Input is validated before anything touches the store; a batch that
 * fails validation throws without applying any op.
 */
export function createCanvasOpsReceiver(editor: Editor) {
	return {
		/** Apply a whole `{ ops }` batch as one undo step. */
		async applyBatch(batch: unknown, attribution?: unknown): Promise<ApplyOpsResult> {
			const { ops } = OpsBatchSchema.parse(batch)
			return applyOps(editor, ops, AttributionSchema.parse(attribution ?? {}))
		},
	}
}

export type CanvasOpsReceiver = ReturnType<typeof createCanvasOpsReceiver>
