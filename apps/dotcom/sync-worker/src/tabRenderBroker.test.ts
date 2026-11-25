import { TabRenderRequest } from '@tldraw/dotcom-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	BATCH_CLAIM_TTL_MS,
	BatchClaim,
	TAB_RENDER_ACK_TIMEOUT_MS,
	TAB_RENDER_MAX_PING_AGE_MS,
	TAB_RENDER_WORK_TIMEOUT_MS,
	TabRenderBroker,
	TabRenderSocket,
	TabRenderTarget,
	batchClaimAfter,
	isExpiredBatchClaim,
	keepDeliverableTabRenderSessions,
	pickTabRenderSessions,
	pickTabRenderTargets,
	planClaimedBatch,
} from './tabRenderBroker'

const NOW = 1_000_000
const socket = (overrides: Partial<TabRenderSocket>): TabRenderSocket => ({
	sessionId: 'session',
	userId: 'user_a',
	lastSeenAt: NOW,
	...overrides,
})

describe('pickTabRenderSessions', () => {
	it('picks only the sockets of the user who asked', () => {
		const picked = pickTabRenderSessions(
			[
				socket({ sessionId: 'mine' }),
				socket({ sessionId: 'teammate', userId: 'user_b' }),
				socket({ sessionId: 'anonymous', userId: null }),
			],
			'user_a',
			NOW
		)
		expect(picked).toEqual(['mine'])
	})

	it('skips a socket that stopped pinging, which is what a sleeping laptop looks like', () => {
		const picked = pickTabRenderSessions(
			[socket({ sessionId: 'asleep', lastSeenAt: NOW - TAB_RENDER_MAX_PING_AGE_MS - 1 })],
			'user_a',
			NOW
		)
		expect(picked).toEqual([])
	})

	it('orders tabs most recently pinged first, and dedupes a superseded socket', () => {
		const picked = pickTabRenderSessions(
			[
				socket({ sessionId: 'oldest', lastSeenAt: NOW - 400 }),
				socket({ sessionId: 'newest', lastSeenAt: NOW - 100 }),
				socket({ sessionId: 'newest', lastSeenAt: NOW - 500 }),
				socket({ sessionId: 'middle', lastSeenAt: NOW - 200 }),
				socket({ sessionId: 'third', lastSeenAt: NOW - 300 }),
			],
			'user_a',
			NOW
		)
		expect(picked).toEqual(['newest', 'middle', 'third', 'oldest'])
	})
})

describe('keepDeliverableTabRenderSessions', () => {
	const targets: Record<string, TabRenderTarget> = {
		tab: { userId: 'user_a', canTabRender: true },
		// A superseded tab socket qualified at pick time, but these hold the session id now.
		agent: { userId: 'user_a', canTabRender: false },
		teammate: { userId: 'user_b', canTabRender: true },
	}

	it('keeps only sessions whose current socket is a tab of the user who asked', () => {
		const kept = keepDeliverableTabRenderSessions(
			['tab', 'agent', 'teammate', 'gone'],
			'user_a',
			(sessionId) => targets[sessionId] ?? null
		)
		expect(kept).toEqual(['tab'])
	})
})

describe('pickTabRenderTargets', () => {
	const lastActiveAt = (sessionId: string) => ({ idle: 1, active: 9, older: 5 })[sessionId] ?? 0

	// A batch sent to two tabs would land twice.
	it('sends a write, and a question about the user, only to the tab they were last active in', () => {
		const tabs = ['idle', 'active', 'older']
		expect(pickTabRenderTargets('apply_ops', tabs, lastActiveAt)).toEqual(['active'])
		expect(pickTabRenderTargets('user_state', tabs, lastActiveAt)).toEqual(['active'])
	})

	it('sends a read to several tabs, capped so one call cannot work every copy of a board', () => {
		const tabs = ['a', 'b', 'c', 'd', 'e']
		expect(pickTabRenderTargets('read', tabs, lastActiveAt)).toEqual(['a', 'b', 'c'])
	})
})

// An attempt the server hasn't confirmed may still be in its tab, which pushes it on reconnect however
// late, so only that tab may decide what happens to a resend.
describe('planClaimedBatch', () => {
	const claim: BatchClaim = { opsHash: 'ops', sessionId: 'first', metaEntry: 'entry', at: NOW }
	const applied = {
		status: 'applied',
		pageId: 'page:a',
		pageName: 'A',
		result: { applied: 1 },
	} as const

	it("answers a resend with the attempt's result", () => {
		const resolved = { ...claim, resolvedAt: NOW, applied }
		expect(planClaimedBatch(resolved, 'ops', false, NOW)).toEqual({
			kind: 'answer',
			outcome: applied,
		})
	})

	it('says a resend whose attempt reached the board has landed', () => {
		expect(planClaimedBatch(claim, 'ops', true, NOW)).toEqual({
			kind: 'answer',
			outcome: { status: 'declined', reason: 'already_applied' },
		})
	})

	it('asks the tab with the attempt while it is unresolved, however long that takes', () => {
		expect(planClaimedBatch(claim, 'ops', false, NOW + 30 * BATCH_CLAIM_TTL_MS)).toEqual({
			kind: 'ask_claimant',
			sessionId: 'first',
		})
	})

	it('refuses a key reused for different ops', () => {
		expect(planClaimedBatch(claim, 'other ops', false, NOW)).toEqual({
			kind: 'answer',
			outcome: { status: 'declined', reason: 'batch_key_reused' },
		})
	})

	it('lets a key run again a day after its batch landed', () => {
		const resolved = { ...claim, resolvedAt: NOW, applied }
		expect(planClaimedBatch(resolved, 'ops', false, NOW + BATCH_CLAIM_TTL_MS)).toEqual({
			kind: 'run',
		})
		expect(isExpiredBatchClaim(resolved, NOW + BATCH_CLAIM_TTL_MS)).toBe(true)
		expect(isExpiredBatchClaim(claim, NOW + 30 * BATCH_CLAIM_TTL_MS)).toBe(false)
	})
})

describe('batchClaimAfter', () => {
	const claim: BatchClaim = { opsHash: 'ops', sessionId: 'first', metaEntry: 'entry', at: NOW }
	const first = { resend: false, now: NOW }
	const resend = { resend: true, now: NOW }

	it('keeps the result of an applied batch', () => {
		const applied = { status: 'applied', pageId: 'page:a', pageName: 'A', result: {} } as const
		expect(batchClaimAfter(claim, applied, first)).toEqual({ ...claim, resolvedAt: NOW, applied })
	})

	it('resolves the key when the claimant says the batch is on the server', () => {
		const landed = { status: 'declined', reason: 'already_applied' } as const
		expect(batchClaimAfter(claim, landed, resend)).toEqual({ ...claim, resolvedAt: NOW })
	})

	it.each([
		{ status: 'work_timeout' },
		{ status: 'declined', reason: 'unconfirmed' },
		{ status: 'declined', reason: 'apply_failed' },
	] as const)('keeps the key unresolved after %j, which may have landed', (outcome) => {
		expect(batchClaimAfter(claim, outcome, first)).toEqual(claim)
	})

	it.each([
		{ status: 'ack_timeout' },
		{ status: 'declined', reason: 'busy' },
		{ status: 'declined', reason: 'invalid_ops' },
		{ status: 'declined', reason: 'failed' },
	] as const)('frees the key after a first attempt that answered %j', (outcome) => {
		expect(batchClaimAfter(claim, outcome, first)).toBeNull()
	})

	// A claimant that declines before checking its store, say mid-drag, may still hold the attempt.
	it('keeps the key after a resend the claimant declined', () => {
		const busy = { status: 'declined', reason: 'busy' } as const
		expect(batchClaimAfter(claim, busy, resend)).toEqual(claim)
	})
})

describe('TabRenderBroker', () => {
	const read = {
		mode: 'read',
		page: { kind: 'ordinal', ordinal: 0 },
		clusterIds: [] as string[],
	} as const

	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	const applyOps: TabRenderRequest = {
		mode: 'apply_ops',
		ops: [],
		attribution: { userId: 'user_a', runId: 'run' },
	}

	function dispatch(sessionIds: string[], request: TabRenderRequest = read) {
		const broker = new TabRenderBroker()
		const jobIds = new Map<string, string>()
		const issued = sessionIds.map((sessionId) => `job-${sessionId}`)
		const result = broker.dispatch(sessionIds, request, issued, (sessionId, jobId) => {
			jobIds.set(sessionId, jobId)
		})
		return { broker, jobIds, result }
	}

	it('gives each tab its own job id, so a reply can only speak for one tab', () => {
		const { jobIds } = dispatch(['a', 'b'])
		expect(new Set(jobIds.values()).size).toBe(2)
	})

	it('resolves with the first answer and ignores the rest', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })

		expect(broker.receive(jobIds.get('b')!, { status: 'captured', base64: 'first' })).toBe(true)
		expect(broker.receive(jobIds.get('a')!, { status: 'captured', base64: 'second' })).toBe(false)

		await expect(result).resolves.toEqual({ status: 'captured', base64: 'first' })
	})

	it('reports the first reply from any tab, once', () => {
		const broker = new TabRenderBroker()
		const onFirstReply = vi.fn()
		void broker.dispatch(['a', 'b'], read, ['job-a', 'job-b'], () => {}, onFirstReply)

		broker.receive('job-a', { status: 'accepted' })
		broker.receive('job-b', { status: 'accepted' })

		expect(onFirstReply).toHaveBeenCalledTimes(1)
	})

	it('refuses a reply for a job it never issued', () => {
		const { broker, jobIds } = dispatch(['a'])
		expect(broker.has('made-up')).toBe(false)
		expect(broker.has(jobIds.get('a')!)).toBe(true)
		expect(broker.receive('made-up', { status: 'accepted' })).toBe(false)
	})

	// The case the ack exists for: the socket looks fine and nobody is home, so the call should
	// cost the ack window rather than the whole work timeout.
	it('gives up after the ack window when no tab acknowledges', async () => {
		const { result } = dispatch(['a'])
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ status: 'ack_timeout' })
	})

	it('lets an acknowledged tab run past the ack window, up to the work timeout', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })

		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		expect(broker.receive(jobIds.get('a')!, { status: 'accepted' })).toBe(true)

		await vi.advanceTimersByTimeAsync(TAB_RENDER_WORK_TIMEOUT_MS.read)
		await expect(result).resolves.toEqual({ status: 'work_timeout' })
	})

	it('answers at once when every tab declines, without waiting out a window', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'page_not_current' })
		broker.receive(jobIds.get('b')!, { status: 'declined', reason: 'page_not_current' })
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'page_not_current' })
	})

	it('waits for a tab still working when another declines', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })
		broker.receive(jobIds.get('b')!, { status: 'declined', reason: 'editor_not_ready' })
		broker.receive(jobIds.get('a')!, { status: 'page_not_found', reason: 'no_pages', pageCount: 0 })
		await expect(result).resolves.toEqual({
			status: 'page_not_found',
			reason: 'no_pages',
			pageCount: 0,
		})
	})

	// One tab declined and the other is asleep: the sleeper can no longer rescue the job, so nothing
	// should wait beyond the ack window for it.
	it('stops at the ack window when the only other tab never answered', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'page_not_current' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'page_not_current' })
	})

	it('answers with the decline when the last working tab fails after the ack window', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'failed' })
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'failed' })
	})

	// A frozen tab keeps its socket and runs the job when it thaws, long after the agent moved on.
	it('refuses a tab that claims a write after the job ended', async () => {
		const { broker, jobIds, result } = dispatch(['a'], applyOps)

		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await result

		expect(broker.receive(jobIds.get('a')!, { status: 'accepted' })).toBe(false)
	})
})
