import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { TLUiTranslation } from './translations'
import {
	TranslationsContext,
	useCurrentTranslation,
	useDirection,
	useMaybeCurrentTranslation,
	useTranslation,
} from './useTranslation'

// The repo-wide test setup mocks this module's `useCurrentTranslation` to always succeed, since
// most tests don't care about translation context. Unmock it here so we can test its real
// context-dependent behavior.
vi.unmock('./useTranslation')

const rtlTranslation: TLUiTranslation = {
	locale: 'ar',
	label: 'Arabic',
	dir: 'rtl',
	messages: DEFAULT_TRANSLATION,
}

function withTranslation(translation: TLUiTranslation) {
	return ({ children }: { children: React.ReactNode }) => (
		<TranslationsContext.Provider value={translation}>{children}</TranslationsContext.Provider>
	)
}

describe('useCurrentTranslation', () => {
	it('returns the current translation when inside a provider', () => {
		const { result } = renderHook(() => useCurrentTranslation(), {
			wrapper: withTranslation(rtlTranslation),
		})
		expect(result.current).toBe(rtlTranslation)
	})

	it('throws when used outside of a provider', () => {
		expect(() => renderHook(() => useCurrentTranslation())).toThrow(
			'useCurrentTranslation must be used inside of <TldrawUiContextProvider />'
		)
	})
})

describe('useMaybeCurrentTranslation', () => {
	it('returns the current translation when inside a provider', () => {
		const { result } = renderHook(() => useMaybeCurrentTranslation(), {
			wrapper: withTranslation(rtlTranslation),
		})
		expect(result.current).toBe(rtlTranslation)
	})

	it('returns null when used outside of a provider, without throwing', () => {
		const { result } = renderHook(() => useMaybeCurrentTranslation())
		expect(result.current).toBeNull()
	})
})

describe('useDirection', () => {
	it('returns the direction from the current translation when inside a provider', () => {
		const { result } = renderHook(() => useDirection(), {
			wrapper: withTranslation(rtlTranslation),
		})
		expect(result.current).toBe('rtl')
	})

	it('falls back to "ltr" when used outside of a provider, without throwing', () => {
		const { result } = renderHook(() => useDirection())
		expect(result.current).toBe('ltr')
	})
})

describe('useTranslation', () => {
	function msgWith(messages: Record<string, string>, locale = 'en') {
		const { result } = renderHook(() => useTranslation(), {
			wrapper: withTranslation({
				locale,
				label: locale,
				dir: 'ltr',
				messages: { ...DEFAULT_TRANSLATION, ...messages } as TLUiTranslation['messages'],
			}),
		})
		return result.current
	}

	it('looks up a plain message', () => {
		expect(msgWith({})('action.copy')).toBe('Copy')
	})

	it('substitutes values into a placeholder', () => {
		expect(msgWith({})('a11y.shape-index', { num: 2, total: 7 })).toBe('2 of 7')
	})

	it('selects a plural category from the locale, not from the value alone', () => {
		const msg = msgWith({})
		expect(msg('comments.replies', { count: 1 })).toBe('1 reply')
		expect(msg('comments.replies', { count: 4 })).toBe('4 replies')
	})

	it('picks the reactor phrasing by number of reactors', () => {
		const msg = msgWith({})
		const names = { a: 'Ada', b: 'Bo', c: 'Cy' }
		expect(msg('comments.reacted', { ...names, count: 1, others: -2 })).toBe('Ada reacted')
		expect(msg('comments.reacted', { ...names, count: 2, others: -1 })).toBe('Ada and Bo reacted')
		expect(msg('comments.reacted', { ...names, count: 3, others: 0 })).toBe(
			'Ada, Bo and Cy reacted'
		)
		expect(msg('comments.reacted', { ...names, count: 4, others: 1 })).toBe(
			'Ada, Bo, Cy and 1 other reacted'
		)
		expect(msg('comments.reacted', { ...names, count: 6, others: 3 })).toBe(
			'Ada, Bo, Cy and 3 others reacted'
		)
	})

	// Apps are documented to pass their own keys and plain text through `msg`.
	it('returns an unknown key as-is', () => {
		expect(msgWith({})('my.own.key')).toBe('my.own.key')
		expect(msgWith({ 'my.own.key': 'Mine' })('my.own.key')).toBe('Mine')
	})

	it('passes a nullish id straight through', () => {
		expect(msgWith({})(undefined)).toBeUndefined()
	})

	// An app's override is not necessarily valid ICU. A stray brace must not take down the UI.
	it('falls back to the raw string when an override is malformed', () => {
		expect(msgWith({ 'my.own.key': 'Cost: {' })('my.own.key', { n: 1 })).toBe('Cost: {')
	})
})
