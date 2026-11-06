import type { Editor } from 'tldraw'
import { applyOps, createOpsStream } from './ops'
import {
	AttributionSchema,
	CanvasOpSchema,
	MAX_OPS_PER_BATCH,
	OpsBatchSchema,
	type ApplyOpsResult,
	type Attribution,
	type CanvasOp,
} from './schema'

export type { ApplyOpsResult, Attribution, CanvasOp, OpResult, OpsBatch } from './schema'

/**
 * Receives canvas ops from an untrusted sender (a canvas agent, a socket, a postMessage) and
 * applies them to `editor`. Input is validated before anything touches the store; a batch that
 * fails validation throws without applying any op.
 */
export function createCanvasOpsReceiver(editor: Editor) {
	const streams = new Map<string, { apply: ReturnType<typeof createOpsStream>; idle: number }>()
	const parseAttribution = (raw: unknown): Attribution => AttributionSchema.parse(raw ?? {})
	const close = (id: string) => {
		const entry = streams.get(id)
		if (!entry) return
		editor.timers.clearTimeout(entry.idle)
		streams.delete(id)
	}

	return {
		/** Apply a whole `{ ops }` batch as one undo step. */
		async applyBatch(batch: unknown, attribution?: unknown): Promise<ApplyOpsResult> {
			const { ops } = OpsBatchSchema.parse(batch)
			return applyOps(editor, ops, parseAttribution(attribution))
		},

		/**
		 * Apply ops as they arrive for stream `id`. The first call opens the stream; pass `finish`
		 * with the last ops to close it. A stream nobody finishes closes after
		 * `STREAM_IDLE_TIMEOUT_MS` without a chunk.
		 */
		async streamOps(
			id: string,
			ops: unknown,
			finish: boolean,
			attribution?: unknown
		): Promise<ApplyOpsResult> {
			try {
				const parsed: CanvasOp[] = CanvasOpSchema.array().max(MAX_OPS_PER_BATCH).parse(ops)
				let entry = streams.get(id)
				if (entry) editor.timers.clearTimeout(entry.idle)
				const apply = entry?.apply ?? createOpsStream(editor, parseAttribution(attribution))
				entry = { apply, idle: editor.timers.setTimeout(() => close(id), STREAM_IDLE_TIMEOUT_MS) }
				streams.set(id, entry)
				return await apply(parsed, finish)
			} finally {
				if (finish) close(id)
			}
		},
	}
}

const STREAM_IDLE_TIMEOUT_MS = 60_000
