import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MAX_TAB_RENDER_SESSIONS,
	TAB_RENDER_ACK_TIMEOUT_MS,
	TAB_RENDER_MAX_PING_AGE_MS,
	TAB_RENDER_WORK_TIMEOUT_MS,
	TabRenderBroker,
	TabRenderSocket,
	TabRenderTarget,
	keepDeliverableTabRenderSessions,
	pickTabRenderSessions,
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

	it('caps the tabs asked, most recently pinged first, and dedupes a superseded socket', () => {
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
		expect(picked).toEqual(['newest', 'middle', 'third'].slice(0, MAX_TAB_RENDER_SESSIONS))
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

describe('TabRenderBroker', () => {
	const measure = { mode: 'measure', pageId: 'page:a' } as const

	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	function dispatch(sessionIds: string[]) {
		const broker = new TabRenderBroker()
		const jobIds = new Map<string, string>()
		const result = broker.dispatch('user_a', sessionIds, measure, (sessionId, jobId) => {
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
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })

		expect(
			broker.receive(jobIds.get('b')!, 'user_a', { status: 'captured', base64: 'first' })
		).toBe(true)
		expect(
			broker.receive(jobIds.get('a')!, 'user_a', { status: 'captured', base64: 'second' })
		).toBe(false)

		await expect(result).resolves.toEqual({ status: 'captured', base64: 'first' })
	})

	it('refuses a reply for a job it never issued', () => {
		const { broker, jobIds } = dispatch(['a'])
		expect(broker.has('made-up', 'user_a')).toBe(false)
		expect(broker.has(jobIds.get('a')!, 'user_a')).toBe(true)
		expect(broker.receive('made-up', 'user_a', { status: 'accepted' })).toBe(false)
	})

	// The case the ack exists for: the socket looks fine and nobody is home, so the fallback should
	// cost the ack window rather than the whole work timeout.
	it("refuses a reply from anyone but the job's user, and still takes the user's own", async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		const jobId = jobIds.get('a')!
		expect(broker.has(jobId, 'user_b')).toBe(false)
		expect(broker.receive(jobId, 'user_b', { status: 'captured', base64: 'forged' })).toBe(false)
		expect(broker.receive(jobId, 'user_a', { status: 'captured', base64: 'real' })).toBe(true)
		await expect(result).resolves.toEqual({ status: 'captured', base64: 'real' })
	})

	it('gives up after the ack window when no tab acknowledges', async () => {
		const { result } = dispatch(['a'])
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ status: 'ack_timeout' })
	})

	it('lets an acknowledged tab run past the ack window, up to the work timeout', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })

		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		expect(broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })).toBe(true)

		await vi.advanceTimersByTimeAsync(TAB_RENDER_WORK_TIMEOUT_MS.measure)
		await expect(result).resolves.toEqual({ status: 'work_timeout' })
	})

	it('falls back at once when every tab declines, without waiting out a window', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'declined', reason: 'page_not_current' })
		broker.receive(jobIds.get('b')!, 'user_a', { status: 'declined', reason: 'page_not_current' })
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'page_not_current' })
	})

	it('waits for a tab still working when another declines', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })
		broker.receive(jobIds.get('b')!, 'user_a', { status: 'declined', reason: 'editor_not_ready' })
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'measured', shapes: {} })
		await expect(result).resolves.toEqual({ status: 'measured', shapes: {} })
	})

	// One tab declined and the other is asleep: the sleeper can no longer rescue the job, so nothing
	// should wait beyond the ack window for it.
	it('stops at the ack window when the only other tab never answered', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'declined', reason: 'page_not_current' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'page_not_current' })
	})

	it('falls back when the last working tab fails after the ack window', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		broker.receive(jobIds.get('a')!, 'user_a', { status: 'declined', reason: 'failed' })
		await expect(result).resolves.toEqual({ status: 'declined', reason: 'failed' })
	})

	it('forgets a job once it finishes', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await result
		expect(broker.receive(jobIds.get('a')!, 'user_a', { status: 'accepted' })).toBe(false)
	})
})
