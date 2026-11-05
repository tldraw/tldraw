import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MAX_TAB_RENDER_SESSIONS,
	TAB_RENDER_ACK_TIMEOUT_MS,
	TAB_RENDER_MAX_PING_AGE_MS,
	TAB_RENDER_WORK_TIMEOUT_MS,
	TabRenderBroker,
	TabRenderSocket,
	parseTabRenderReply,
	pickTabRenderSessions,
} from './tabRenderBroker'

const NOW = 1_000_000
const socket = (overrides: Partial<TabRenderSocket>): TabRenderSocket => ({
	sessionId: 'session',
	userId: 'user_a',
	canRender: true,
	lastPingAt: NOW,
	...overrides,
})

describe('pickTabRenderSessions', () => {
	it('picks only sockets that can render, for the user who asked', () => {
		const picked = pickTabRenderSessions(
			[
				socket({ sessionId: 'mine' }),
				socket({ sessionId: 'teammate', userId: 'user_b' }),
				socket({ sessionId: 'anonymous', userId: null }),
				// An agent joined on the same user's OAuth token: it has the user id, and no editor.
				socket({ sessionId: 'agent', canRender: false }),
			],
			'user_a',
			NOW
		)
		expect(picked).toEqual(['mine'])
	})

	it('skips a socket that stopped pinging, which is what a sleeping laptop looks like', () => {
		const picked = pickTabRenderSessions(
			[socket({ sessionId: 'asleep', lastPingAt: NOW - TAB_RENDER_MAX_PING_AGE_MS - 1 })],
			'user_a',
			NOW
		)
		expect(picked).toEqual([])
	})

	it('keeps a socket too new to have pinged', () => {
		const picked = pickTabRenderSessions(
			[socket({ sessionId: 'fresh', lastPingAt: null })],
			'user_a',
			NOW
		)
		expect(picked).toEqual(['fresh'])
	})

	it('caps the tabs asked, most recently pinged first, and dedupes a superseded socket', () => {
		const picked = pickTabRenderSessions(
			[
				socket({ sessionId: 'oldest', lastPingAt: NOW - 400 }),
				socket({ sessionId: 'newest', lastPingAt: NOW - 100 }),
				socket({ sessionId: 'newest', lastPingAt: NOW - 500 }),
				socket({ sessionId: 'middle', lastPingAt: NOW - 200 }),
				socket({ sessionId: 'third', lastPingAt: NOW - 300 }),
			],
			'user_a',
			NOW
		)
		expect(picked).toEqual(['newest', 'middle', 'third'].slice(0, MAX_TAB_RENDER_SESSIONS))
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
		const result = broker.dispatch(sessionIds, measure, (sessionId, jobId) => {
			jobIds.set(sessionId, jobId)
		})
		return { broker, jobIds, result }
	}

	it('answers with nothing to do when no tab was picked', async () => {
		const { result } = dispatch([])
		await expect(result).resolves.toEqual({ outcome: 'no_tab' })
	})

	it('gives each tab its own job id, so a reply can only speak for one tab', () => {
		const { jobIds } = dispatch(['a', 'b'])
		expect(new Set(jobIds.values()).size).toBe(2)
	})

	it('resolves with the first answer and ignores the rest', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })

		expect(broker.receive(jobIds.get('b')!, { status: 'captured', base64: 'first' })).toBe(true)
		expect(broker.receive(jobIds.get('a')!, { status: 'captured', base64: 'second' })).toBe(false)

		await expect(result).resolves.toEqual({ outcome: 'captured', base64: 'first' })
	})

	it('refuses a reply for a job it never issued', () => {
		const { broker } = dispatch(['a'])
		expect(broker.receive('made-up', { status: 'accepted' })).toBe(false)
	})

	// The case the ack exists for: the socket looks fine and nobody is home, so the fallback should
	// cost the ack window rather than the whole work timeout.
	it('gives up after the ack window when no tab acknowledges', async () => {
		const { result } = dispatch(['a'])
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ outcome: 'ack_timeout' })
	})

	it('lets an acknowledged tab run past the ack window, up to the work timeout', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })

		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		expect(broker.receive(jobIds.get('a')!, { status: 'accepted' })).toBe(true)

		await vi.advanceTimersByTimeAsync(TAB_RENDER_WORK_TIMEOUT_MS.measure)
		await expect(result).resolves.toEqual({ outcome: 'work_timeout' })
	})

	it('falls back at once when every tab declines, without waiting out a window', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'page_not_current' })
		broker.receive(jobIds.get('b')!, { status: 'declined', reason: 'page_not_current' })
		await expect(result).resolves.toEqual({ outcome: 'declined', reason: 'page_not_current' })
	})

	it('waits for a tab still working when another declines', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })
		broker.receive(jobIds.get('b')!, { status: 'declined', reason: 'editor_not_ready' })
		broker.receive(jobIds.get('a')!, { status: 'measured', shapes: {} })
		await expect(result).resolves.toEqual({ outcome: 'measured', shapes: {} })
	})

	// One tab declined and the other is asleep: the sleeper can no longer rescue the job, so nothing
	// should wait beyond the ack window for it.
	it('stops at the ack window when the only other tab never answered', async () => {
		const { broker, jobIds, result } = dispatch(['a', 'b'])
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'page_not_current' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await expect(result).resolves.toEqual({ outcome: 'declined', reason: 'page_not_current' })
	})

	it('falls back when the last working tab fails after the ack window', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		broker.receive(jobIds.get('a')!, { status: 'accepted' })
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS + 1)
		broker.receive(jobIds.get('a')!, { status: 'declined', reason: 'failed' })
		await expect(result).resolves.toEqual({ outcome: 'declined', reason: 'failed' })
	})

	it('forgets a job once it finishes', async () => {
		const { broker, jobIds, result } = dispatch(['a'])
		await vi.advanceTimersByTimeAsync(TAB_RENDER_ACK_TIMEOUT_MS)
		await result
		expect(broker.receive(jobIds.get('a')!, { status: 'accepted' })).toBe(false)
	})
})

describe('parseTabRenderReply', () => {
	it.each([
		[{ status: 'accepted' }],
		[{ status: 'declined', reason: 'page_not_current' }],
		[{ status: 'measured', shapes: {} }],
		[{ status: 'captured', base64: 'iVBORw0KGgoAAAANSUhEUg' }],
	])('accepts %j', (reply) => {
		expect(parseTabRenderReply(reply)).toEqual(reply)
	})

	it.each([
		[null],
		['accepted'],
		[{ status: 'nonsense' }],
		[{ status: 'declined', reason: 'not a reason' }],
		[{ status: 'measured' }],
		[{ status: 'measured', shapes: [] }],
		[{ status: 'captured', base64: 42 }],
		// Whatever this is, the tool result would call it a PNG.
		[{ status: 'captured', base64: 'PHN2ZyB4bWxucz0' }],
	])('refuses %j', (reply) => {
		expect(parseTabRenderReply(reply)).toBeNull()
	})
})
