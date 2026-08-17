import { describe, expect, it, vi } from 'vitest'
import { Environment } from './types'
import worker from './worker'

function makeEnv(): Environment {
	return {
		TAIL: { writeDataPoint: vi.fn() },
		TLDRAW_ENV: 'test',
		GRAFANA_LOKI_ENDPOINT: 'https://loki.test/loki/api/v1/push',
		GRAFANA_LOKI_USER: 'user',
		GRAFANA_LOKI_TOKEN: 'token',
	} as unknown as Environment
}

function makeCtx() {
	return { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext
}

describe('tail handler', () => {
	it('accepts an empty batch without throwing or pushing anything', async () => {
		const env = makeEnv()
		const ctx = makeCtx()

		await worker.tail([], env, ctx)

		expect(ctx.waitUntil).not.toHaveBeenCalled()
	})
})
