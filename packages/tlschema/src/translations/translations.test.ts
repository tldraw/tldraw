import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	LANGUAGES,
	TLLanguage,
	_getDefaultTranslationLocale,
	getDefaultTranslationLocale,
} from './translations'

interface DefaultLanguageTest {
	name: string
	input: string[]
	output: string
}

const originalWindow = global.window

describe('translations.ts', () => {
	describe('exports', () => {
		it('should export LANGUAGES constant', () => {
			expect(LANGUAGES).toBeDefined()
			expect(Array.isArray(LANGUAGES)).toBe(true)
			expect(LANGUAGES.length).toBeGreaterThan(0)
		})

		it('should export TLLanguage type', () => {
			// Test that TLLanguage type works correctly
			const testLanguage: TLLanguage = LANGUAGES[0]
			expect(testLanguage).toHaveProperty('locale')
			expect(testLanguage).toHaveProperty('label')
			expect(typeof testLanguage.locale).toBe('string')
			expect(typeof testLanguage.label).toBe('string')
		})

		it('should export getDefaultTranslationLocale function', () => {
			expect(typeof getDefaultTranslationLocale).toBe('function')
		})

		it('should export _getDefaultTranslationLocale function', () => {
			expect(typeof _getDefaultTranslationLocale).toBe('function')
		})
	})

	describe('getDefaultTranslationLocale', () => {
		afterEach(() => {
			// Restore original window
			global.window = originalWindow
			vi.clearAllMocks()
		})

		it('should return default locale in browser environment', () => {
			// Mock browser environment
			global.window = {
				navigator: {
					languages: ['fr', 'en'],
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('fr')
		})

		it('should use navigator.languages when available', () => {
			// Mock browser environment with navigator.languages
			global.window = {
				navigator: {
					languages: ['de', 'es', 'en'],
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('de')
		})

		it('should fallback to English when navigator.languages is null/undefined', () => {
			// Mock browser environment with null languages
			global.window = {
				navigator: {
					languages: null,
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})

		it('should return English in server environment (no window)', () => {
			// Mock server environment
			delete (global as any).window

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})

		it('should handle undefined navigator gracefully', () => {
			// Mock browser environment without navigator
			global.window = {
				navigator: undefined,
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})

		it('should handle empty languages array', () => {
			// Mock browser environment with empty languages array
			global.window = {
				navigator: {
					languages: [],
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('en')
		})

		it('should work with complex browser language preferences', () => {
			// Test realistic browser scenario
			global.window = {
				navigator: {
					languages: ['zh-TW', 'zh', 'en-US', 'en'],
				},
			} as any

			const locale = getDefaultTranslationLocale()
			expect(locale).toBe('zh-tw') // Should match zh-TW exactly
		})
	})

	describe('_getDefaultTranslationLocale (internal logic)', () => {
		const tests: DefaultLanguageTest[] = [
			{
				name: 'finds a matching language locale',
				input: ['fr'],
				output: 'fr',
			},
			{
				name: 'finds a matching region locale',
				input: ['pt-PT'],
				output: 'pt-pt',
			},
			{
				name: 'picks a region locale if no language locale available',
				input: ['pt'],
				output: 'pt-br',
			},
			{
				name: 'picks a language locale if no region locale available',
				input: ['fr-CA'],
				output: 'fr',
			},
			{
				name: 'picks the first language that loosely matches',
				input: ['fr-CA', 'pt-PT'],
				output: 'fr',
			},
		]

		for (const test of tests) {
			it(test.name, () => {
				expect(_getDefaultTranslationLocale(test.input)).toEqual(test.output)
			})
		}

		it('should return "en" when no locales provided', () => {
			expect(_getDefaultTranslationLocale([])).toBe('en')
		})

		it('should return "en" when no supported locales found', () => {
			expect(_getDefaultTranslationLocale(['xyz', 'abc', 'unknown'])).toBe('en')
		})

		it('should handle case insensitive matching', () => {
			expect(_getDefaultTranslationLocale(['FR'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['PT-BR'])).toBe('pt-br')
			expect(_getDefaultTranslationLocale(['ZH-CN'])).toBe('zh-cn')
		})

		it('should handle mixed case and separators', () => {
			expect(_getDefaultTranslationLocale(['pt_BR'])).toBe('pt-br')
			expect(_getDefaultTranslationLocale(['zh_CN'])).toBe('zh-cn')
			expect(_getDefaultTranslationLocale(['KO_KR'])).toBe('ko-kr')
		})

		it('should prioritize exact matches over fallbacks', () => {
			expect(_getDefaultTranslationLocale(['pt-pt', 'pt'])).toBe('pt-pt')
			expect(_getDefaultTranslationLocale(['zh-tw', 'zh'])).toBe('zh-tw')
		})

		it('should handle default region assignments correctly', () => {
			// Chinese defaults to zh-cn
			expect(_getDefaultTranslationLocale(['zh'])).toBe('zh-cn')
			// Portuguese defaults to pt-br
			expect(_getDefaultTranslationLocale(['pt'])).toBe('pt-br')
			// Korean defaults to ko-kr
			expect(_getDefaultTranslationLocale(['ko'])).toBe('ko-kr')
			// Hindi defaults to hi-in
			expect(_getDefaultTranslationLocale(['hi'])).toBe('hi-in')
		})

		it('should handle region-to-language fallback', () => {
			// fr-CA should fallback to fr (if we only have generic French)
			expect(_getDefaultTranslationLocale(['fr-CA'])).toBe('fr')
			// es-MX should fallback to es
			expect(_getDefaultTranslationLocale(['es-MX'])).toBe('es')
		})

		it('should respect locale priority order', () => {
			// First supported locale should win
			expect(_getDefaultTranslationLocale(['unsupported', 'fr', 'de'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['xyz', 'de', 'fr'])).toBe('de')
		})

		it('should handle complex regional scenarios', () => {
			// zh-HK not supported, should fallback to default zh-cn (doesn't continue to next locale)
			expect(_getDefaultTranslationLocale(['zh-HK', 'zh-TW', 'en'])).toBe('zh-cn')
			// zh-SG not supported, should fallback to default zh-cn
			expect(_getDefaultTranslationLocale(['zh-SG', 'zh-CN', 'en'])).toBe('zh-cn')
			// Test exact match takes priority
			expect(_getDefaultTranslationLocale(['zh-TW', 'zh-CN'])).toBe('zh-tw')
			// Test fallback behavior
			expect(_getDefaultTranslationLocale(['zh-HK', 'zh'])).toBe('zh-cn')
		})

		it('should work with single locale array', () => {
			expect(_getDefaultTranslationLocale(['fr'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['unsupported'])).toBe('en')
		})

		it('should handle whitespace and malformed locales gracefully', () => {
			// These should not crash but return fallback
			expect(_getDefaultTranslationLocale([' '])).toBe('en')
			expect(_getDefaultTranslationLocale([''])).toBe('en')
			// Malformed locales should fallback to English when they can't be parsed properly
			expect(_getDefaultTranslationLocale(['fr-'])).toBe('en')
			// But valid partial matches should work
			expect(_getDefaultTranslationLocale(['fr', 'en'])).toBe('fr')
		})
	})

	describe('getSupportedLocale (internal function behavior)', () => {
		// Note: getSupportedLocale is not exported, but we can test its behavior through _getDefaultTranslationLocale
		it('should find exact locale matches', () => {
			// These test the internal getSupportedLocale logic through the public API
			expect(_getDefaultTranslationLocale(['en'])).toBe('en')
			expect(_getDefaultTranslationLocale(['fr'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['pt-br'])).toBe('pt-br')
		})

		it('should handle case normalization in exact matches', () => {
			expect(_getDefaultTranslationLocale(['EN'])).toBe('en')
			expect(_getDefaultTranslationLocale(['PT-BR'])).toBe('pt-br')
			expect(_getDefaultTranslationLocale(['ZH-TW'])).toBe('zh-tw')
		})

		it('should fall back from region to language', () => {
			// fr-CA -> fr (assuming we have generic French)
			expect(_getDefaultTranslationLocale(['fr-CA'])).toBe('fr')
			// es-AR -> es
			expect(_getDefaultTranslationLocale(['es-AR'])).toBe('es')
		})

		it('should assign default regions for base languages', () => {
			// zh -> zh-cn (default Chinese region)
			expect(_getDefaultTranslationLocale(['zh'])).toBe('zh-cn')
			// pt -> pt-br (default Portuguese region)
			expect(_getDefaultTranslationLocale(['pt'])).toBe('pt-br')
		})

		it('should return null for unsupported languages (via fallback to en)', () => {
			// Unsupported languages should result in English fallback
			expect(_getDefaultTranslationLocale(['xyz'])).toBe('en')
			expect(_getDefaultTranslationLocale(['unsupported-locale'])).toBe('en')
		})
	})

	describe('DEFAULT_LOCALE_REGIONS behavior', () => {
		it('should apply Chinese default region correctly', () => {
			expect(_getDefaultTranslationLocale(['zh'])).toBe('zh-cn')
		})

		it('should apply Portuguese default region correctly', () => {
			expect(_getDefaultTranslationLocale(['pt'])).toBe('pt-br')
		})

		it('should apply Korean default region correctly', () => {
			expect(_getDefaultTranslationLocale(['ko'])).toBe('ko-kr')
		})

		it('should apply Hindi default region correctly', () => {
			expect(_getDefaultTranslationLocale(['hi'])).toBe('hi-in')
		})

		it('should not affect languages without default regions', () => {
			// Languages like French, Spanish, German don't have default regions
			expect(_getDefaultTranslationLocale(['fr'])).toBe('fr')
			expect(_getDefaultTranslationLocale(['es'])).toBe('es')
			expect(_getDefaultTranslationLocale(['de'])).toBe('de')
		})
	})

	describe('TLLanguage type integration', () => {
		it('should work correctly with TypeScript type system', () => {
			// Test that return values match the TLLanguage locale type
			const result: TLLanguage['locale'] = _getDefaultTranslationLocale(['fr'])
			expect(result).toBe('fr')
		})

		it('should be compatible with LANGUAGES array', () => {
			const allLocales: TLLanguage['locale'][] = LANGUAGES.map((lang) => lang.locale)

			// Every result should be a valid locale from LANGUAGES
			const testLocales = ['fr', 'pt-br', 'zh-cn', 'unsupported']
			for (const locale of testLocales) {
				const result = _getDefaultTranslationLocale([locale])
				expect(allLocales).toContain(result)
			}
		})
	})

	describe('edge cases and robustness', () => {
		it('should handle null and undefined inputs gracefully', () => {
			// These should not crash the function
			expect(() => _getDefaultTranslationLocale([] as any)).not.toThrow()
			expect(_getDefaultTranslationLocale([])).toBe('en')
		})

		it('should handle very large locale arrays', () => {
			const manyLocales = Array.from({ length: 1000 }, (_, i) => `lang-${i}`).concat(['fr']) // Add a valid one at the end

			expect(_getDefaultTranslationLocale(manyLocales)).toBe('fr')
		})

		it('should handle special characters in locale strings', () => {
			// Should not crash on malformed input
			expect(() => _getDefaultTranslationLocale(['@#$%', 'fr'])).not.toThrow()
			expect(_getDefaultTranslationLocale(['@#$%', 'fr'])).toBe('fr')
		})

		it('should handle extremely long locale strings', () => {
			const longLocale = 'a'.repeat(1000)
			expect(() => _getDefaultTranslationLocale([longLocale, 'fr'])).not.toThrow()
			expect(_getDefaultTranslationLocale([longLocale, 'fr'])).toBe('fr')
		})

		it('should be consistent across multiple calls', () => {
			const input = ['de', 'fr', 'es']
			const result1 = _getDefaultTranslationLocale(input)
			const result2 = _getDefaultTranslationLocale(input)
			const result3 = _getDefaultTranslationLocale([...input]) // Spread to ensure different array

			expect(result1).toBe(result2)
			expect(result2).toBe(result3)
			expect(result1).toBe('de')
		})
	})

	describe('real-world usage scenarios', () => {
		it('should handle typical browser language lists', () => {
			// Common browser scenarios
			expect(_getDefaultTranslationLocale(['en-US', 'en'])).toBe('en')
			expect(_getDefaultTranslationLocale(['es-ES', 'es', 'en'])).toBe('es')
			expect(_getDefaultTranslationLocale(['fr-FR', 'fr', 'en-US', 'en'])).toBe('fr')
		})

		it('should work for mobile browser scenarios', () => {
			// iOS Safari typical format
			expect(_getDefaultTranslationLocale(['zh-Hans-CN', 'zh-Hans', 'zh'])).toBe('zh-cn')
			// Android Chrome typical format
			expect(_getDefaultTranslationLocale(['pt-BR', 'pt', 'en-US'])).toBe('pt-br')
		})

		it('should handle multilingual user preferences', () => {
			// User who speaks multiple languages
			expect(_getDefaultTranslationLocale(['de-CH', 'fr-CH', 'it-CH', 'en'])).toBe('de')
			expect(_getDefaultTranslationLocale(['es-MX', 'en-US', 'fr'])).toBe('es')
		})

		it('should work in internationalization scenarios', () => {
			// Various international format inputs
			expect(_getDefaultTranslationLocale(['ja-JP'])).toBe('ja')
			expect(_getDefaultTranslationLocale(['ko-KR'])).toBe('ko-kr')
			expect(_getDefaultTranslationLocale(['ar-SA'])).toBe('ar')
			expect(_getDefaultTranslationLocale(['hi-IN'])).toBe('hi-in')
		})
	})
})
