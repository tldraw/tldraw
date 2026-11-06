import type { Editor } from 'tldraw'
import { applyOps, createOpsStream } from './ops'
import {
	AttributionSchema,
	CanvasOpSchema,
	expandOpsBatch,
	OpsBatchSchema,
	type ApplyOpsResult,
	type Attribution,
	type CanvasOp,
} from './schema'

export type { ApplyOpsResult, Attribution, CanvasOp, OpResult, OpsBatch } from './schema'
export { applyOps, createOpsStream }

/**
 * Receives canvas ops from an untrusted sender (a canvas agent, a socket, a postMessage) and
 * applies them to `editor`. Input is validated before anything touches the store; a batch that
 * fails validation throws without applying any op.
 */
export function createCanvasOpsReceiver(editor: Editor) {
	const streams = new Map<string, ReturnType<typeof createOpsStream>>()
	const parseAttribution = (raw: unknown): Attribution => AttributionSchema.parse(raw ?? {})

	return {
		/** Apply a whole `{ assembly?, ops }` batch as one undo step. */
		async applyBatch(batch: unknown, attribution?: unknown): Promise<ApplyOpsResult> {
			const ops = expandOpsBatch(OpsBatchSchema.parse(batch))
			return applyOps(editor, ops, parseAttribution(attribution))
		},

		/**
		 * Apply ops as they arrive for stream `id`. The first call opens the stream; pass `finish`
		 * with the last ops to close it.
		 */
		async streamOps(
			id: string,
			ops: unknown,
			finish: boolean,
			attribution?: unknown
		): Promise<ApplyOpsResult> {
			const parsed: CanvasOp[] = CanvasOpSchema.array().parse(ops)
			let stream = streams.get(id)
			if (!stream) {
				stream = createOpsStream(editor, parseAttribution(attribution))
				streams.set(id, stream)
			}
			try {
				return await stream(parsed, finish)
			} finally {
				if (finish) streams.delete(id)
			}
		},
	}
}

export type CanvasOpsReceiver = ReturnType<typeof createCanvasOpsReceiver>
