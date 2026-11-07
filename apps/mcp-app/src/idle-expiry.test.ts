/**
 * Idle expiry against the real worker under wrangler dev.
 *
 * The one assertion that matters most: after the expiry alarm fires on a kept
 * session, exactly one `expireIfIdle` schedule row remains, with a new id. The
 * SDK deletes the executing row after the callback returns, so a re-arm that
 * dedups would vanish with it and the DO would never expire. This test checks
 * the outcome — our callback leaves a replacement row behind — while
 * agents-canary.test.ts checks the SDK ordering that outcome depends on.
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
	MINIMAL_FIXTURES,
	initSession,
	mcpPost,
	startWranglerDev,
	type WranglerDevHandle,
} from './wrangler-dev-harness'

// Short enough that the expiry alarm fires inside the test; the re-arm floor
// (60s) still pushes the next one out, so we only assert the row survived.
const IDLE_TTL_MS = 3000

// Alarm delivery under wrangler dev is not tied to the schedule time: on a
// loaded runner the condemn + destroy chain has landed 8s past the TTL (#10709).
const ALARM_DEADLINE_MS = 20_000

async function waitFor<T>(probe: () => Promise<T | undefined>, what: string): Promise<T> {
	const deadline = Date.now() + ALARM_DEADLINE_MS
	for (;;) {
		const value = await probe()
		if (value !== undefined) return value
		if (Date.now() > deadline) throw new Error(`timed out after ${ALARM_DEADLINE_MS}ms: ${what}`)
		// 1s keeps a full deadline of polls under the worker's 30 req/min
		// per-session rate limit.
		await new Promise((res) => setTimeout(res, 1000))
	}
}

describe('session DO idle expiry', () => {
	const port = 8700 + (process.pid % 500)
	let server: WranglerDevHandle | null = null
	const base = () => server!.base

	beforeAll(async () => {
		server = await startWranglerDev({
			port,
			vars: { IDLE_TTL_MS_OVERRIDE: String(IDLE_TTL_MS) },
			fixtures: MINIMAL_FIXTURES,
		})
	}, 90_000)

	afterAll(() => server?.stop())

	async function schedules(sessionId: string): Promise<Array<{ id: string; time: number }>> {
		const res = await fetch(`${base()}/admin/schedules?session=${sessionId}`, {
			signal: AbortSignal.timeout(20_000),
		})
		return res.json()
	}

	async function saveCheckpoint(sessionId: string) {
		const res = await mcpPost(
			base(),
			{
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/call',
				params: {
					name: 'save_checkpoint',
					arguments: {
						checkpointId: 'cp-1',
						shapesJson: JSON.stringify([{ id: 'shape:a', type: 'geo', x: 0, y: 0 }]),
					},
				},
			},
			sessionId
		)
		expect(res.status).toBe(200)
		await res.text()
	}

	test('exactly one expiry row after init, and still one after saves', async () => {
		const sessionId = await initSession(base(), 'idle-expiry')
		expect(await schedules(sessionId)).toHaveLength(1)
		await saveCheckpoint(sessionId)
		await saveCheckpoint(sessionId)
		expect(await schedules(sessionId)).toHaveLength(1)
	}, 30_000)

	test('the re-arm survives the first alarm fire (new row, same count)', async () => {
		const sessionId = await initSession(base(), 'idle-expiry')
		await saveCheckpoint(sessionId)
		const [first] = await schedules(sessionId)
		expect(first).toBeDefined()

		// the TTL alarm fires during this wait; the session was active seconds ago
		// so expireIfIdle keeps it and must re-arm. The old row is deleted only after
		// the callback returns, so both rows are briefly visible: wait for exactly one.
		const [replacement] = await waitFor(async () => {
			const current = await schedules(sessionId)
			return current.length === 1 && current[0].id !== first.id ? current : undefined
		}, 'expiry row replaced after the first alarm fire')
		expect(replacement.time).toBeGreaterThan(first.time)
	}, 30_000)

	test('a session that never saves is destroyed by its own expiry alarm', async () => {
		// No checkpoint means no lastActivity, which reads as maximally idle: the
		// first alarm condemns it, and the subsequent destroy alarm wipes it.
		const sessionId = await initSession(base(), 'idle-expiry')
		const status = await waitFor(async () => {
			const res = await mcpPost(
				base(),
				{ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
				sessionId
			)
			await res.text()
			// 429 is the rate limiter, not the DO: keep waiting
			return res.status === 200 || res.status === 429 ? undefined : res.status
		}, 'session destroyed after the expiry alarm')
		expect(status).toBe(404)
	}, 30_000)
})
