#!/usr/bin/env node

/**
 * Comprehensive translation audit script.
 * Checks for: missing keys, extra keys, untranslated strings,
 * placeholder mismatches, empty strings, and suspicious patterns.
 *
 * Outputs a JSON report to stdout.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const ROOT = new URL('..', import.meta.url).pathname

// ---- Helpers ----

function loadJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'))
}

function extractPlaceholders(str) {
	const matches = str.match(/\{[^}]+\}/g)
	return matches ? matches.sort() : []
}

// ---- SDK translations ----

function auditSdk() {
	const dir = join(ROOT, 'packages/assets/translations')
	const mainJson = loadJson(join(dir, 'main.json'))
	const englishKeys = Object.keys(mainJson)

	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.json') && f !== 'main.json' && f !== 'languages.json' && f !== 'en.json')
		.sort()

	const issues = []

	for (const file of files) {
		const locale = basename(file, '.json')
		const translations = loadJson(join(dir, file))
		const translationKeys = Object.keys(translations)

		// Missing keys
		for (const key of englishKeys) {
			if (!(key in translations)) {
				issues.push({
					source: 'sdk',
					locale,
					key,
					type: 'missing_key',
					englishValue: mainJson[key],
					translatedValue: null,
				})
			}
		}

		// Extra keys (in translation but not in English)
		for (const key of translationKeys) {
			if (!(key in mainJson)) {
				issues.push({
					source: 'sdk',
					locale,
					key,
					type: 'extra_key',
					englishValue: null,
					translatedValue: translations[key],
				})
			}
		}

		for (const key of englishKeys) {
			if (!(key in translations)) continue
			const en = mainJson[key]
			const tr = translations[key]

			// Empty translations
			if (tr === '' || tr === null || tr === undefined) {
				issues.push({
					source: 'sdk',
					locale,
					key,
					type: 'empty_translation',
					englishValue: en,
					translatedValue: tr,
				})
				continue
			}

			// Untranslated (identical to English) - skip for very short strings (1-2 chars)
			// and strings that are likely the same across languages (e.g. "JSON", "SVG", "PNG")
			const likelySameAcrossLanguages =
				/^[A-Z0-9]+$/.test(en) || // acronyms
				/^https?:\/\//.test(en) || // URLs
				en.length <= 2

			if (tr === en && !likelySameAcrossLanguages) {
				issues.push({
					source: 'sdk',
					locale,
					key,
					type: 'untranslated',
					englishValue: en,
					translatedValue: tr,
				})
			}

			// Placeholder mismatches
			const enPlaceholders = extractPlaceholders(en)
			const trPlaceholders = extractPlaceholders(tr)
			if (JSON.stringify(enPlaceholders) !== JSON.stringify(trPlaceholders)) {
				issues.push({
					source: 'sdk',
					locale,
					key,
					type: 'placeholder_mismatch',
					englishValue: en,
					translatedValue: tr,
					englishPlaceholders: enPlaceholders,
					translatedPlaceholders: trPlaceholders,
				})
			}
		}
	}

	return issues
}

// ---- Dotcom translations ----

function auditDotcom() {
	const dir = join(ROOT, 'apps/dotcom/client/public/tla/locales')
	const enJson = loadJson(join(dir, 'en.json'))
	const englishKeys = Object.keys(enJson)

	// Build a reverse map: hash -> English text for readability
	const hashToEnglish = {}
	for (const key of englishKeys) {
		hashToEnglish[key] = enJson[key].translation
	}

	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.json') && f !== 'en.json')
		.sort()

	const issues = []

	for (const file of files) {
		const locale = basename(file, '.json')
		const translations = loadJson(join(dir, file))
		const translationKeys = Object.keys(translations)

		// Missing keys
		for (const key of englishKeys) {
			if (!(key in translations)) {
				issues.push({
					source: 'dotcom',
					locale,
					key,
					type: 'missing_key',
					englishValue: hashToEnglish[key],
					translatedValue: null,
				})
			}
		}

		// Extra keys
		for (const key of translationKeys) {
			if (!(key in enJson)) {
				issues.push({
					source: 'dotcom',
					locale,
					key,
					type: 'extra_key',
					englishValue: null,
					translatedValue: translations[key]?.translation,
				})
			}
		}

		for (const key of englishKeys) {
			if (!(key in translations)) continue
			const en = hashToEnglish[key]
			const tr = translations[key].translation

			if (tr === '' || tr === null || tr === undefined) {
				issues.push({
					source: 'dotcom',
					locale,
					key,
					type: 'empty_translation',
					englishValue: en,
					translatedValue: tr,
				})
				continue
			}

			// Untranslated
			const likelySameAcrossLanguages =
				/^[A-Z0-9]+$/.test(en) || /^https?:\/\//.test(en) || en.length <= 2

			if (tr === en && !likelySameAcrossLanguages) {
				issues.push({
					source: 'dotcom',
					locale,
					key,
					type: 'untranslated',
					englishValue: en,
					translatedValue: tr,
				})
			}

			// Placeholder mismatches
			const enPlaceholders = extractPlaceholders(en)
			const trPlaceholders = extractPlaceholders(tr)
			if (JSON.stringify(enPlaceholders) !== JSON.stringify(trPlaceholders)) {
				issues.push({
					source: 'dotcom',
					locale,
					key,
					type: 'placeholder_mismatch',
					englishValue: en,
					translatedValue: tr,
					englishPlaceholders: enPlaceholders,
					translatedPlaceholders: trPlaceholders,
				})
			}
		}
	}

	return issues
}

// ---- Main ----

const sdkIssues = auditSdk()
const dotcomIssues = auditDotcom()
const allIssues = [...sdkIssues, ...dotcomIssues]

// Summary
const summary = {
	total: allIssues.length,
	byType: {},
	bySource: { sdk: 0, dotcom: 0 },
	byLocale: {},
}

for (const issue of allIssues) {
	summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1
	summary.bySource[issue.source]++
	summary.byLocale[issue.locale] = (summary.byLocale[issue.locale] || 0) + 1
}

const report = {
	generated: new Date().toISOString(),
	summary,
	issues: allIssues,
}

console.log(JSON.stringify(report, null, 2))
