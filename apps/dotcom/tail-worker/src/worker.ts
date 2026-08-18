/// <reference types="@cloudflare/workers-types" />

import { Aggregator } from './aggregate'
import { toErrRow, writeAggRow, writeErrRow } from './analytics'
import {
	classifyHandler,
	entrypointOf,
	isErrorOutcome,
	scriptNameOf,
	scriptVersionOf,
} from './classify'
import { LokiEntry, pushToLoki, toLokiEntry } from './loki'
import { Environment } from './types'

// Module scope, so it survives between invocations of the same isolate. See FLUSH_AFTER_EVENTS in
// aggregate.ts for what that buys and what it costs. Exported so tests can clear it between cases.
export const aggregator = new Aggregator()

export default {
	async tail(events: TraceItem[], env: Environment, ctx: ExecutionContext): Promise<void> {
		const errorEntries: LokiEntry[] = []

		for (const item of events) {
			try {
				const handler = classifyHandler(item)

				aggregator.add({
					scriptName: scriptNameOf(item),
					entrypoint: entrypointOf(item),
					handler,
					outcome: item.outcome,
					scriptVersion: scriptVersionOf(item),
					wallTime: item.wallTime,
					cpuTime: item.cpuTime,
				})

				if (!isErrorOutcome(item.outcome)) continue

				// Error rows bypass the accumulator entirely: an isolate eviction losing an aggregate
				// tally is fine, losing the exception we built this worker to see is not.
				const row = toErrRow(item, handler, env.TLDR_DOC)
				writeErrRow(env.TAIL, row)
				errorEntries.push(toLokiEntry(item, handler, row.errorName, env.TLDRAW_ENV, env.TLDR_DOC))
			} catch (_e) {
				// One malformed TraceItem must not take out the whole batch — without this, a single bad
				// item loses every AE row and the whole Loki push for every other item alongside it.
			}
		}

		const now = Date.now()
		if (aggregator.shouldFlush(now)) {
			for (const bucket of aggregator.drain(now)) {
				writeAggRow(env.TAIL, bucket)
			}
		}

		if (errorEntries.length > 0) {
			ctx.waitUntil(pushToLoki(env, errorEntries))
		}
	},
}
