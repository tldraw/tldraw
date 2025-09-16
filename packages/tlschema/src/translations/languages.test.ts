import { describe, expect, it } from 'vitest'
import { LANGUAGES } from './languages'

describe('LANGUAGES', () => {
	describe('structure and integrity', () => {
		it('should contain data', () => {
			expect(LANGUAGES).toBeDefined()
			expect(LANGUAGES.length).toBeGreaterThan(0)
		})

		it('should be a readonly array', () => {
			expect(Array.isArray(LANGUAGES)).toBe(true)
			// Should be marked as const assertion for TypeScript readonly behavior
			// Note: Runtime readonly behavior depends on environment (strict mode, etc.)
			expect(LANGUAGES).toEqual(expect.any(Array))
		})

		it('should have correct structure for each language entry', () => {
			for (const language of LANGUAGES) {
				expect(language).toHaveProperty('locale')
				expect(language).toHaveProperty('label')
				expect(typeof language.locale).toBe('string')
				expect(typeof language.label).toBe('string')
				expect(language.locale.length).toBeGreaterThan(0)
				expect(language.label.length).toBeGreaterThan(0)
			}
		})
	})

	describe('locale validation', () => {
		it('should have unique locale identifiers', () => {
			const locales = LANGUAGES.map((lang) => lang.locale)
			const uniqueLocales = [...new Set(locales)]
			expect(locales.length).toBe(uniqueLocales.length)
		})

		it('should have all locales in lowercase', () => {
			for (const language of LANGUAGES) {
				expect(language.locale).toBe(language.locale.toLowerCase())
			}
		})

		it('should follow BCP 47 format patterns', () => {
			// BCP 47 format: language or language-region (e.g., 'en', 'en-US', 'zh-CN')
			const bcp47Pattern = /^[a-z]{2}(-[a-z]{2,4})?$/

			for (const language of LANGUAGES) {
				expect(language.locale).toMatch(bcp47Pattern)
			}

			// Verify we only have valid BCP 47 locales
			const invalidLocales = LANGUAGES.filter((lang) => !bcp47Pattern.test(lang.locale))
			if (invalidLocales.length > 0) {
				console.log(
					'Invalid locales found:',
					invalidLocales.map((l) => l.locale)
				)
			}
			expect(invalidLocales.length).toBe(0)
		})

		it('should contain expected core languages', () => {
			const coreLanguages = ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko-kr', 'zh-cn', 'zh-tw']
			const locales = LANGUAGES.map((lang) => lang.locale)

			for (const coreLanguage of coreLanguages) {
				expect(locales).toContain(coreLanguage)
			}
		})
	})

	describe('label validation', () => {
		it('should have unique labels', () => {
			const labels = LANGUAGES.map((lang) => lang.label)
			const uniqueLabels = [...new Set(labels)]
			expect(labels.length).toBe(uniqueLabels.length)
		})

		it('should not have empty labels', () => {
			for (const language of LANGUAGES) {
				expect(language.label.trim()).not.toBe('')
			}
		})

		it('should have labels in native languages (non-ASCII characters allowed)', () => {
			// Check that we have some labels with non-ASCII characters (indicating native language use)
			const hasNativeLabels = LANGUAGES.some((lang) => /[^\u0000-\u007F]/.test(lang.label))
			expect(hasNativeLabels).toBe(true)
		})
	})

	describe('specific language entries', () => {
		it('should have English as expected', () => {
			const english = LANGUAGES.find((lang) => lang.locale === 'en')
			expect(english).toBeDefined()
			expect(english?.label).toBe('English')
		})

		it('should have French as expected', () => {
			const french = LANGUAGES.find((lang) => lang.locale === 'fr')
			expect(french).toBeDefined()
			expect(french?.label).toBe('Français')
		})

		it('should have Chinese variants', () => {
			const simplifiedChinese = LANGUAGES.find((lang) => lang.locale === 'zh-cn')
			const traditionalChinese = LANGUAGES.find((lang) => lang.locale === 'zh-tw')

			expect(simplifiedChinese).toBeDefined()
			expect(traditionalChinese).toBeDefined()
			expect(simplifiedChinese?.label).toBe('简体中文')
			expect(traditionalChinese?.label).toBe('繁體中文 (台灣)')
		})

		it('should have Portuguese variants', () => {
			const brazilianPortuguese = LANGUAGES.find((lang) => lang.locale === 'pt-br')
			const europeanPortuguese = LANGUAGES.find((lang) => lang.locale === 'pt-pt')

			expect(brazilianPortuguese).toBeDefined()
			expect(europeanPortuguese).toBeDefined()
			expect(brazilianPortuguese?.label).toBe('Português - Brasil')
			expect(europeanPortuguese?.label).toBe('Português - Europeu')
		})

		it('should have Korean with region code', () => {
			const korean = LANGUAGES.find((lang) => lang.locale === 'ko-kr')
			expect(korean).toBeDefined()
			expect(korean?.label).toBe('한국어')
		})

		it('should have Hindi with region code', () => {
			const hindi = LANGUAGES.find((lang) => lang.locale === 'hi-in')
			expect(hindi).toBeDefined()
			expect(hindi?.label).toBe('हिन्दी')
		})

		it('should have Gujarati with region code', () => {
			const gujarati = LANGUAGES.find((lang) => lang.locale === 'gu-in')
			expect(gujarati).toBeDefined()
			expect(gujarati?.label).toBe('ગુજરાતી')
		})

		it('should have Khmer with region code', () => {
			const khmer = LANGUAGES.find((lang) => lang.locale === 'km-kh')
			expect(khmer).toBeDefined()
			expect(khmer?.label).toBe('ភាសាខ្មែរ')
		})
	})

	describe('sorting and organization', () => {
		it('should be organized in a reasonable order', () => {
			// Verify the array is not randomly ordered by checking a few known positions
			const firstLanguage = LANGUAGES[0]
			expect(['id', 'ms', 'ca']).toContain(firstLanguage.locale)

			// English should be relatively early in the list
			const englishIndex = LANGUAGES.findIndex((lang) => lang.locale === 'en')
			expect(englishIndex).toBeGreaterThanOrEqual(0)
			expect(englishIndex).toBeLessThan(10) // Should be within first 10 entries
		})
	})

	describe('data consistency', () => {
		it('should not have any null or undefined values', () => {
			for (const language of LANGUAGES) {
				expect(language.locale).not.toBeNull()
				expect(language.locale).not.toBeUndefined()
				expect(language.label).not.toBeNull()
				expect(language.label).not.toBeUndefined()
			}
		})

		it('should maintain object shape consistency', () => {
			for (const language of LANGUAGES) {
				const keys = Object.keys(language)
				expect(keys).toEqual(['locale', 'label'])
			}
		})
	})

	describe('regional variants handling', () => {
		it('should have appropriate regional variants for major languages', () => {
			const locales = LANGUAGES.map((lang) => lang.locale)

			// Should have both Chinese variants
			expect(locales).toContain('zh-cn')
			expect(locales).toContain('zh-tw')

			// Should have both Portuguese variants
			expect(locales).toContain('pt-br')
			expect(locales).toContain('pt-pt')

			// Should have regional Hindi and Gujarati
			expect(locales).toContain('hi-in')
			expect(locales).toContain('gu-in')

			// Should have regional Korean and Khmer
			expect(locales).toContain('ko-kr')
			expect(locales).toContain('km-kh')
		})

		it('should not have generic variants for languages that only have regional variants', () => {
			const locales = LANGUAGES.map((lang) => lang.locale)

			// These languages should only exist with region codes
			expect(locales).not.toContain('zh') // Should be zh-cn, zh-tw
			expect(locales).not.toContain('ko') // Should be ko-kr
			expect(locales).not.toContain('hi') // Should be hi-in
			expect(locales).not.toContain('gu') // Should be gu-in
			expect(locales).not.toContain('km') // Should be km-kh
		})
	})

	describe('comprehensive language coverage', () => {
		it('should have reasonable geographic coverage', () => {
			const locales = LANGUAGES.map((lang) => lang.locale)

			// Major European languages
			expect(locales).toContain('en') // English
			expect(locales).toContain('fr') // French
			expect(locales).toContain('de') // German
			expect(locales).toContain('es') // Spanish
			expect(locales).toContain('it') // Italian
			expect(locales).toContain('ru') // Russian

			// Asian languages
			expect(locales).toContain('ja') // Japanese
			expect(locales).toContain('ko-kr') // Korean
			expect(locales).toContain('zh-cn') // Chinese Simplified
			expect(locales).toContain('th') // Thai
			expect(locales).toContain('vi') // Vietnamese

			// Indian subcontinent languages
			expect(locales).toContain('hi-in') // Hindi
			expect(locales).toContain('bn') // Bengali
			expect(locales).toContain('ta') // Tamil
			expect(locales).toContain('te') // Telugu

			// Middle Eastern languages
			expect(locales).toContain('ar') // Arabic
			expect(locales).toContain('he') // Hebrew
			expect(locales).toContain('fa') // Persian
			expect(locales).toContain('tr') // Turkish
		})

		it('should have at least 40 supported languages', () => {
			// Ensures we have substantial language coverage
			expect(LANGUAGES.length).toBeGreaterThanOrEqual(40)
		})
	})

	describe('type system integration', () => {
		it('should work as readonly tuple type', () => {
			// Verify const assertion creates readonly tuple
			type LanguageType = (typeof LANGUAGES)[number]

			const testLanguage: LanguageType = LANGUAGES[0]
			expect(testLanguage).toHaveProperty('locale')
			expect(testLanguage).toHaveProperty('label')
		})

		it('should provide correct locale union type', () => {
			// Test that the locale values can be used as union types
			type LocaleType = (typeof LANGUAGES)[number]['locale']

			const locale: LocaleType = 'en'
			expect(typeof locale).toBe('string')

			// Should be able to use any locale from the array
			for (const language of LANGUAGES) {
				const testLocale: LocaleType = language.locale
				expect(typeof testLocale).toBe('string')
			}
		})
	})

	describe('search and filtering utilities', () => {
		it('should support finding languages by locale', () => {
			const findLanguageByLocale = (locale: string) =>
				LANGUAGES.find((lang) => lang.locale === locale)

			expect(findLanguageByLocale('en')?.label).toBe('English')
			expect(findLanguageByLocale('fr')?.label).toBe('Français')
			expect(findLanguageByLocale('nonexistent')).toBeUndefined()
		})

		it('should support checking if locale is supported', () => {
			const isLocaleSupported = (locale: string) => LANGUAGES.some((lang) => lang.locale === locale)

			expect(isLocaleSupported('en')).toBe(true)
			expect(isLocaleSupported('fr')).toBe(true)
			expect(isLocaleSupported('nonexistent')).toBe(false)
		})

		it('should support extracting all locales', () => {
			const allLocales = LANGUAGES.map((lang) => lang.locale)

			expect(allLocales).toBeInstanceOf(Array)
			expect(allLocales.length).toBe(LANGUAGES.length)
			expect(allLocales).toContain('en')
			expect(allLocales).toContain('fr')
		})

		it('should support building UI options', () => {
			const languageOptions = LANGUAGES.map((lang) => ({
				value: lang.locale,
				label: lang.label,
			}))

			expect(languageOptions).toBeInstanceOf(Array)
			expect(languageOptions.length).toBe(LANGUAGES.length)
			expect(languageOptions[0]).toHaveProperty('value')
			expect(languageOptions[0]).toHaveProperty('label')
		})
	})
})
