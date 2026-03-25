import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeatureFlags } from '../utils/FeatureFlagPoller'

vi.mock('@tldraw/utils', async () => {
	const actual = await vi.importActual<typeof import('@tldraw/utils')>('@tldraw/utils')
	return {
		...actual,
		getFromLocalStorage: vi.fn(() => null),
	}
})

import { getFromLocalStorage } from '@tldraw/utils'
import { shouldUseProperZero } from './TldrawApp'

const mockedGetFromLocalStorage = vi.mocked(getFromLocalStorage)

const originalWebdriver = navigator.webdriver

afterEach(() => {
	mockedGetFromLocalStorage.mockReset()
	Object.defineProperty(navigator, 'webdriver', { value: originalWebdriver, configurable: true })
})

const FLAGS_OFF: FeatureFlags = {
	sqlite_file_storage: { enabled: false },
	zero_enabled: { enabled: false },
	zero_kill_switch: { enabled: false },
}

describe('shouldUseProperZero', () => {
	it('returns false with default flags and no overrides', () => {
		const result = shouldUseProperZero(FLAGS_OFF)
		expect(result).toEqual({ value: false, reason: 'server feature flag' })
	})

	describe('kill switch', () => {
		it('returns false when kill switch is active, even if zero_enabled is true', () => {
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_enabled: { enabled: true },
				zero_kill_switch: { enabled: true },
			}
			const result = shouldUseProperZero(flags, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('kill switch active')
		})

		it('returns false when kill switch is active, even with localStorage override', () => {
			mockedGetFromLocalStorage.mockReturnValue('true')
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_kill_switch: { enabled: true },
			}
			const result = shouldUseProperZero(flags)
			expect(result.value).toBe(false)
			expect(result.reason).toBe('kill switch active')
		})
	})

	describe('automated testing (navigator.webdriver)', () => {
		it('returns false when webdriver is true, even for @tldraw.com emails', () => {
			Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
			const result = shouldUseProperZero(FLAGS_OFF, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('automated testing')
		})

		it('returns false when webdriver is true, even with zero_enabled flag', () => {
			Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_enabled: { enabled: true },
			}
			const result = shouldUseProperZero(flags, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('automated testing')
		})

		it('kill switch still takes priority over webdriver check', () => {
			Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_kill_switch: { enabled: true },
			}
			const result = shouldUseProperZero(flags)
			expect(result.value).toBe(false)
			expect(result.reason).toBe('kill switch active')
		})
	})

	describe('localStorage override', () => {
		it('returns true when localStorage says true', () => {
			mockedGetFromLocalStorage.mockReturnValue('true')
			const result = shouldUseProperZero(FLAGS_OFF)
			expect(result.value).toBe(true)
			expect(result.reason).toBe('localStorage override')
		})

		it('returns false when localStorage says false (overrides email)', () => {
			mockedGetFromLocalStorage.mockReturnValue('false')
			const result = shouldUseProperZero(FLAGS_OFF, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('localStorage override')
		})
	})

	describe('@tldraw.com email', () => {
		it('returns true for tldraw.com emails', () => {
			const result = shouldUseProperZero(FLAGS_OFF, 'alice@tldraw.com')
			expect(result.value).toBe(true)
			expect(result.reason).toBe('@tldraw.com email')
		})

		it('does not match similar but different domains', () => {
			const result = shouldUseProperZero(FLAGS_OFF, 'alice@nottldraw.com')
			expect(result.value).toBe(false)
		})
	})

	describe('server feature flag', () => {
		it('returns true when zero_enabled flag is true', () => {
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_enabled: { enabled: true },
			}
			const result = shouldUseProperZero(flags)
			expect(result.value).toBe(true)
			expect(result.reason).toBe('server feature flag')
		})

		it('returns false when zero_enabled flag is false', () => {
			const result = shouldUseProperZero(FLAGS_OFF)
			expect(result.value).toBe(false)
			expect(result.reason).toBe('server feature flag')
		})
	})

	describe('priority order', () => {
		it('kill switch > webdriver > localStorage > email > flag', () => {
			mockedGetFromLocalStorage.mockReturnValue('true')
			const flags: FeatureFlags = {
				sqlite_file_storage: { enabled: false },
				zero_enabled: { enabled: true },
				zero_kill_switch: { enabled: true },
			}
			// Kill switch wins over everything
			const result = shouldUseProperZero(flags, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('kill switch active')
		})

		it('localStorage > email > flag (when kill switch off)', () => {
			mockedGetFromLocalStorage.mockReturnValue('false')
			const flags: FeatureFlags = {
				...FLAGS_OFF,
				zero_enabled: { enabled: true },
			}
			// localStorage=false wins over email + flag
			const result = shouldUseProperZero(flags, 'dev@tldraw.com')
			expect(result.value).toBe(false)
			expect(result.reason).toBe('localStorage override')
		})

		it('email > flag (when kill switch off, no localStorage)', () => {
			const result = shouldUseProperZero(FLAGS_OFF, 'dev@tldraw.com')
			expect(result.value).toBe(true)
			expect(result.reason).toBe('@tldraw.com email')
		})
	})
})
