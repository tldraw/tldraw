/**
 * Idle pruning and expiry against the real worker under wrangler dev.
 *
 * The one assertion that matters most: after the expiry alarm fires on a kept
 * session, exactly one `expireIfIdle` schedule row remains, with a new id. The
 * SDK deletes the executing row after the callback returns, so a re-arm that
 * dedups would vanish with it and the DO would never expire. Nothing but this
 * test catches that regression on an `agents` bump.
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
	MINIMAL_FIXTURES,
	initSession,
	mcpPost,
	startWranglerDev,
	type WranglerDevHandle,
} from './wrangler-dev-harness'

const MCP_PRUNE_ADMIN_TOKEN = 'test-admin-token'
// Short enough that the expiry alarm fires inside the test; the re-arm floor
// (60s) still pushes the next one out, so we only assert the row survived.
const IDLE_TTL_MS = 3000
const DAY = 24 * 60 * 60 * 1000

describe('session DO pruning and idle expiry', () => {
	const port = 8700 + (process.pid % 500)
	let server: WranglerDevHandle | null = null
	const base = () => server!.base

	beforeAll(async () => {
		server = await startWranglerDev({
			port,
			vars: { MCP_PRUNE_ADMIN_TOKEN, IDLE_TTL_MS_OVERRIDE: String(IDLE_TTL_MS) },
			fixtures: MINIMAL_FIXTURES,
		})
	}, 90_000)

	afterAll(() => server?.stop())

	function admin(path: string, init: RequestInit = {}) {
		return fetch(`${base()}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${MCP_PRUNE_ADMIN_TOKEN}`,
				'Content-Type': 'application/json',
				...init.headers,
			},
			signal: AbortSignal.timeout(20_000),
		})
	}

	async function prune(body: unknown): Promise<{ status: number; json: any }> {
		const res = await admin('/admin/prune', { method: 'POST', body: JSON.stringify(body) })
		return { status: res.status, json: res.status === 200 ? await res.json() : await res.text() }
	}

	async function doId(sessionId: string) {
		const res = await admin(`/admin/do-id?session=${sessionId}`)
		const id = await res.text()
		expect(id).toMatch(/^[0-9a-f]{64}$/)
		return id
	}

	async function schedules(sessionId: string): Promise<Array<{ id: string; time: number }>> {
		const res = await admin(`/admin/schedules?session=${sessionId}`)
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

	describe('/admin/prune gates', () => {
		test('401 without the token', async () => {
			const res = await fetch(`${base()}/admin/prune`, { method: 'POST', body: '{}' })
			expect(res.status).toBe(401)
		})

		test('405 on GET', async () => {
			const res = await admin('/admin/prune')
			expect(res.status).toBe(405)
		})

		test('400 on a non-numeric maxIdleMs or non-boolean dryRun', async () => {
			expect((await prune({ ids: [], maxIdleMs: 'x', dryRun: true })).status).toBe(400)
			expect((await prune({ ids: [], maxIdleMs: 0, dryRun: 'true' })).status).toBe(400)
		})

		test('400 on a real run below the safe floor without force', async () => {
			expect((await prune({ ids: [], maxIdleMs: 0, dryRun: false })).status).toBe(400)
			expect((await prune({ ids: [], maxIdleMs: 0, dryRun: false, force: true })).status).toBe(200)
		})

		test('a malformed id yields a per-id error, not a failed batch', async () => {
			const { status, json } = await prune({ ids: ['zzz'], maxIdleMs: 0, dryRun: true })
			expect(status).toBe(200)
			expect(json).toHaveLength(1)
			expect(json[0].id).toBe('zzz')
			expect(json[0].error).toMatch(/\w+: /)
		})
	})

	describe('session lifecycle', () => {
		test('dry run, condemn, idempotent re-prune, session gone', async () => {
			const sessionId = await initSession(base(), 'prune-integration')
			await saveCheckpoint(sessionId)
			const id = await doId(sessionId)

			let r = await prune({ ids: [id], maxIdleMs: 7 * DAY, dryRun: true })
			expect(r.json[0]).toMatchObject({ id, action: 'kept', checkpointCount: 1 })

			r = await prune({ ids: [id], maxIdleMs: 0, dryRun: true })
			expect(r.json[0]).toMatchObject({ id, action: 'would-destroy', checkpointCount: 1 })
			expect(r.json[0].bytes).toBeGreaterThan(0)

			r = await prune({ ids: [id], maxIdleMs: 0, dryRun: false, force: true })
			expect(r.json[0]).toMatchObject({ id, action: 'destroy-scheduled' })

			// Before the destroy alarm fires: marker found, alarm re-armed. After: the
			// wiped DO re-condemns harmlessly. Either way, never an error row.
			r = await prune({ ids: [id], maxIdleMs: 0, dryRun: false, force: true })
			expect(r.json[0]).toMatchObject({ id, action: 'destroy-scheduled' })

			await new Promise((res) => setTimeout(res, 3000))
			const after = await mcpPost(
				base(),
				{ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
				sessionId
			)
			expect(after.status).toBe(404)
		}, 30_000)
	})

	describe('idle expiry schedule', () => {
		test('exactly one expiry row after init, and still one after saves', async () => {
			const sessionId = await initSession(base(), 'prune-integration')
			expect(await schedules(sessionId)).toHaveLength(1)
			await saveCheckpoint(sessionId)
			await saveCheckpoint(sessionId)
			expect(await schedules(sessionId)).toHaveLength(1)
		}, 30_000)

		test('the re-arm survives the first alarm fire (new row, same count)', async () => {
			const sessionId = await initSession(base(), 'prune-integration')
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
	})
})
