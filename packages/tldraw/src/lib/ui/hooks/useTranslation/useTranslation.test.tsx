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
