import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { warnDeprecatedGetter, warnOnce } from './warn'

describe('warning utilities', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	describe('warnOnce', () => {
		it('logs warning message with tldraw prefix', () => {
			warnOnce('Test warning')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('[tldraw] Test warning')
		})

		it('only logs the same message once', () => {
			warnOnce('Duplicate warning')
			warnOnce('Duplicate warning')
			warnOnce('Duplicate warning')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
		})

		it('logs different messages separately', () => {
			warnOnce('First warning')
			warnOnce('Second warning')
			warnOnce('First warning')

			expect(consoleSpy).toHaveBeenCalledTimes(2)
		})
	})

	describe('warnDeprecatedGetter', () => {
		it('generates correct deprecation warning', () => {
			warnDeprecatedGetter('viewport')

			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'viewport' is deprecated and will be removed in the near future. Please refactor to use 'getViewport' instead."
			)
		})

		it('correctly capitalizes property name', () => {
			warnDeprecatedGetter('camera')

			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'camera' is deprecated and will be removed in the near future. Please refactor to use 'getCamera' instead."
			)
		})

		it('only shows the same deprecation warning once', () => {
			warnDeprecatedGetter('uniqueProp')
			warnDeprecatedGetter('uniqueProp')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
		})
	})
})
