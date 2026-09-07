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

		// the TTL alarm fires inside this wait; the session was active seconds ago
		// so expireIfIdle keeps it and must re-arm
		await new Promise((res) => setTimeout(res, IDLE_TTL_MS + 2500))

		const rows = await schedules(sessionId)
		expect(rows).toHaveLength(1)
		expect(rows[0].id).not.toBe(first.id)
		expect(rows[0].time).toBeGreaterThan(first.time)
	}, 30_000)

	test('a session that never saves is destroyed by its own expiry alarm', async () => {
		// No checkpoint means no lastActivity, which reads as maximally idle: the
		// first alarm condemns it, and the subsequent destroy alarm wipes it.
		const sessionId = await initSession(base(), 'idle-expiry')
		await new Promise((res) => setTimeout(res, IDLE_TTL_MS + 5000))

		const after = await mcpPost(
			base(),
			{ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
			sessionId
		)
		expect(after.status).toBe(404)
	}, 30_000)
})
