/// <reference types="@cloudflare/workers-types" />

import { Environment } from './types'

export default {
	async tail(_events: TraceItem[], _env: Environment, _ctx: ExecutionContext): Promise<void> {
		// filled in by Task 7
	},
}
