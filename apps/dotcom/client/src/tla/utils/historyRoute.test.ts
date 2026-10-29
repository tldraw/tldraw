import { describe, expect, it } from 'vitest'
import { parseHistoryRoute } from './historyRoute'

describe('parseHistoryRoute', () => {
	it('plain file route is not history', () => {
		expect(parseHistoryRoute('/f/abc')).toEqual({ inHistory: false, ts: null })
	})
	it('history list', () => {
		expect(parseHistoryRoute('/f/abc/history')).toEqual({ inHistory: true, ts: null })
	})
	it('history version', () => {
		expect(parseHistoryRoute('/f/abc/history/2026-10-01T00:00:00.000Z')).toEqual({
			inHistory: true,
			ts: '2026-10-01T00:00:00.000Z',
		})
	})
})
