import { afterEach, describe, expect, it, vi } from 'vitest'
import { _getDefaultTranslationLocale, getDefaultTranslationLocale } from './translations'

const originalWindow = global.window

describe('translations.ts', () => {
	describe('getDefaultTranslationLocale', () => {
		afterEach(() => {
			global.window = originalWindow
			vi.clearAllMocks()
		})

		it('should use navigator.languages in browser environment', () => {
			global.window = {
				navigator: {
					languages: ['fr', 'en'],
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('fr')
		})

		it('should return English in server environment (no window)', () => {
			delete (global as any).window

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})

		it('should fallback to English when navigator.languages unavailable', () => {
			global.window = {
				navigator: {
					languages: null,
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})
	})

	describe('_getDefaultTranslationLocale (internal logic)', () => {
		it('should find exact locale matches', () => {
			expect(_getDefaultTranslationLocale(['fr'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['pt-pt'])).toBe('pt-pt')
		})

		it('should fallback from region to language', () => {
			expect(_getDefaultTranslationLocale(['fr-CA'])).toBe('fr')
		})

		it('should assign default regions for base languages', () => {
			expect(_getDefaultTranslationLocale(['zh'])).toBe('zh-cn')
			expect(_getDefaultTranslationLocale(['pt'])).toBe('pt-br')
			expect(_getDefaultTranslationLocale(['ko'])).toBe('ko-kr')
			expect(_getDefaultTranslationLocale(['hi'])).toBe('hi-in')
		})

		it('should return "en" when no supported locales found', () => {
			expect(_getDefaultTranslationLocale([])).toBe('en')
			expect(_getDefaultTranslationLocale(['xyz', 'unknown'])).toBe('en')
		})

		it('should respect priority order', () => {
			expect(_getDefaultTranslationLocale(['unsupported', 'fr', 'de'])).toBe('fr')
		})

		it('should handle case insensitive matching', () => {
			expect(_getDefaultTranslationLocale(['FR'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['PT-BR'])).toBe('pt-br')
		})
	})
})
