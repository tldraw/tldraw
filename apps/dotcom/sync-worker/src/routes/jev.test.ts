import { getJevDecision, parseJevAction } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { jev } from './jev'

const fetchMock = vi.fn()
const limit = vi.fn()
const env = { TYPESAFE_API_KEY: 'test-secret', RATE_LIMITER: { limit } } as unknown as Environment
const state = JSON.stringify({ current: { tool: 'geo' } })
function request(body = JSON.stringify({ state })) {
	return new Request('https://example.com/app/jev', {
		method: 'POST',
		headers: { 'CF-Connecting-IP': '192.0.2.1' },
		body,
	}) as IRequest
}
function answer(choice: string, probability = 0.95, confidence = 0.9) {
	return {
		answers: {
			action: { type: 'choice', choice, confidence, probabilities: { [choice]: probability } },
		},
	}
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	limit.mockResolvedValue({ success: true })
	fetchMock.mockResolvedValue(Response.json(answer('tool:arrow')))
})
afterEach(() => {
	vi.resetAllMocks()
	vi.unstubAllGlobals()
})

describe('Jev decisions', () => {
	it.each([
		'none',
		'tool:erase',
		'tool:hand',
		'tool:arrow:extra',
		'style:color:invisible',
		'__proto__',
		'style:__proto__:red',
	])('rejects unsupported decisions: %s', (choice) => {
		expect(getJevDecision(answer(choice))).toBe('none')
	})
	it.each([0, -0.1, NaN, Infinity, 1.1])('rejects invalid probabilities: %s', (probability) => {
		expect(getJevDecision(answer('tool:arrow', probability))).toBe('none')
	})
	it.each([0, 0.64, NaN, Infinity, 1.1])(
		'does not gate the winner on confidence: %s',
		(confidence) => {
			expect(getJevDecision(answer('tool:arrow', 0.95, confidence))).toBe('tool:arrow')
		}
	)
	it('selects the plurality winner without requiring a majority', () => {
		expect(
			getJevDecision({
				answers: {
					action: {
						type: 'choice',
						choice: 'tool:arrow',
						confidence: 0.1,
						probabilities: { 'tool:arrow': 0.4, 'tool:geo': 0.35, none: 0.25 },
					},
				},
			})
		).toBe('tool:arrow')
	})
	it.each([null, {}, { answers: null }, { answers: { action: { choice: 'tool:arrow' } } }])(
		'fails closed for malformed responses',
		(response) => {
			expect(getJevDecision(response)).toBe('none')
		}
	)
	it('accepts a known next-shape style', () => {
		expect(parseJevAction(getJevDecision(answer('style:color:red')))).toEqual({
			type: 'style',
			style: 'color',
			value: 'red',
		})
	})
})

describe('Jev route', () => {
	it('uses Jev with server-owned choices and does not expose the key or raw response', async () => {
		const response = await jev(request(), env)
		expect(await response.json()).toEqual({
			choice: 'tool:arrow',
			suggestedChoice: 'tool:arrow',
			probability: 0.95,
			confidence: 0.9,
		})
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('https://api.typesafe.ai/v1/systemone')
		expect(init.headers.Authorization).toBe('Bearer test-secret')
		const body = JSON.parse(init.body)
		expect(body.model).toBe('jev-latest')
		expect(body.state).toBe(state)
		expect(body.questions.action.criteria).toHaveProperty('none')
		expect(limit).toHaveBeenCalledWith({ key: 'jev:192.0.2.1' })
	})
	it('does not call TypeSafe without configuration', async () => {
		expect((await jev(request(), { ...env, TYPESAFE_API_KEY: undefined })).status).toBe(503)
		expect(fetchMock).not.toHaveBeenCalled()
	})
	it('rate limits before sending canvas content', async () => {
		limit.mockResolvedValue({ success: false })
		expect((await jev(request(), env)).status).toBe(429)
		expect(fetchMock).not.toHaveBeenCalled()
	})
	it.each([
		'{}',
		'null',
		'{',
		JSON.stringify({ state: '{}' }),
		JSON.stringify({ state: { current: {} } }),
	])('rejects malformed state', async (body) => {
		expect((await jev(request(body), env)).status).toBe(400)
		expect(fetchMock).not.toHaveBeenCalled()
	})
	it('bounds streamed request bodies without relying on Content-Length', async () => {
		expect((await jev(request('x'.repeat(32_001)), env)).status).toBe(413)
		expect(fetchMock).not.toHaveBeenCalled()
	})
	it.each([429, 529, 500])(
		'handles upstream failure %s without exposing response details',
		async (status) => {
			fetchMock.mockResolvedValue(new Response('private error details', { status }))
			const response = await jev(request(), env)
			expect(response.status).toBe(status === 500 ? 502 : 429)
			expect(await response.text()).toBe('Jev unavailable')
		}
	)
	it('handles network failures', async () => {
		fetchMock.mockRejectedValue(new Error('offline'))
		expect((await jev(request(), env)).status).toBe(502)
	})
})
