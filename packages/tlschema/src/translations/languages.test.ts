import { describe, expect, it } from 'vitest'
import { LANGUAGES } from './languages'

describe('LANGUAGES', () => {
	describe('structure and integrity', () => {
		it('should contain data and have correct structure', () => {
			expect(LANGUAGES.length).toBeGreaterThan(0)
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

		it('should follow BCP 47 format patterns', () => {
			const bcp47Pattern = /^[a-z]{2}(-[a-z]{2,4})?$/
			for (const language of LANGUAGES) {
				expect(language.locale).toMatch(bcp47Pattern)
			}
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
	})
})
