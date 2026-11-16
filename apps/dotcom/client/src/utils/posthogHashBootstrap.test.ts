import { getPosthogBootstrapFromHash, takePosthogBootstrapFromHash } from './posthogHashBootstrap'

const now = Date.parse('2026-10-30T12:00:00.000Z')

describe('getPosthogBootstrapFromHash', () => {
	test('accepts ids stamped less than two minutes ago', () => {
		expect(
			getPosthogBootstrapFromHash(`#session_id=s1&distinct_id=d1&ts=${now - 119_000}`, now)
		).toEqual({ sessionID: 's1', distinctID: 'd1' })
	})

	test.each([
		['a missing timestamp', '#session_id=s1&distinct_id=d1'],
		['an empty timestamp', '#session_id=s1&distinct_id=d1&ts='],
		['a non-numeric timestamp', '#session_id=s1&distinct_id=d1&ts=yesterday'],
		['a stale timestamp', `#session_id=s1&distinct_id=d1&ts=${now - 120_000}`],
		['a timestamp from the future', `#session_id=s1&distinct_id=d1&ts=${now + 120_000}`],
		['a missing session id', `#distinct_id=d1&ts=${now}`],
		['a missing distinct id', `#session_id=s1&ts=${now}`],
		['no hash', ''],
	])('ignores %s', (_, hash) => {
		expect(getPosthogBootstrapFromHash(hash, now)).toBeUndefined()
	})
})

describe('takePosthogBootstrapFromHash', () => {
	afterEach(() => {
		vi.useRealTimers()
		window.history.replaceState(null, '', '/')
	})

	test('returns fresh ids and removes the hash, keeping history state', () => {
		vi.useFakeTimers({ now })
		window.history.replaceState(
			{ idx: 3 },
			'',
			`/f/abc?x=1#session_id=s1&distinct_id=d1&ts=${now - 1000}`
		)

		expect(takePosthogBootstrapFromHash()).toEqual({ sessionID: 's1', distinctID: 'd1' })
		expect(window.location.pathname + window.location.search + window.location.hash).toBe(
			'/f/abc?x=1'
		)
		expect(window.history.state).toEqual({ idx: 3 })
	})

	test('removes a stale hash without using it', () => {
		vi.useFakeTimers({ now })
		window.history.replaceState(null, '', '/#session_id=s1&distinct_id=d1')

		expect(takePosthogBootstrapFromHash()).toBeUndefined()
		expect(window.location.hash).toBe('')
	})

	test('leaves unrelated hashes alone', () => {
		window.history.replaceState(null, '', '/#section')

		expect(takePosthogBootstrapFromHash()).toBeUndefined()
		expect(window.location.hash).toBe('#section')
	})
})
