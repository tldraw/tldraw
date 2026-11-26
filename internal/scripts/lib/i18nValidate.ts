import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { MessageFormatElement, TYPE, parse } from '@formatjs/icu-messageformat-parser'
import { PLURAL_CATEGORIES } from './pluralCategories'

type I18nProject = 'sdk' | 'dotcom'

export interface I18nProblem {
	project: I18nProject
	locale: string
	key: string
	message: string
}

interface I18nValidationResult {
	errors: I18nProblem[]
	warnings: string[]
	/** Source keys with no translation yet. These fall back to English at runtime, so aren't errors. */
	missingCount: number
}

const PROJECTS: Record<I18nProject, { source: string; directory: string }> = {
	// The SDK's English lives in main.json; its en.json is an empty stub.
	sdk: { source: 'assets/translations/main.json', directory: 'assets/translations' },
	dotcom: {
		source: 'apps/dotcom/client/public/tla/locales/en.json',
		directory: 'apps/dotcom/client/public/tla/locales',
	},
}

const NON_LOCALE_FILES = new Set(['en', 'main', 'languages'])
const CLDR_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])
// Lokalise's `[%1$s:name]` and bare printf specifiers. ICU parses both as literal text, so a
// translation that switched to them still passes the argument check without this.
// The lookahead keeps ordinary text like "50%de réduction" from matching.
const FOREIGN_PLACEHOLDER = /\[%[^\]]*\]|%(?:\d+\$)?[sd@](?![\p{L}\p{N}])/gu

function pluralCategories(locale: string, type: 'cardinal' | 'ordinal') {
	if (type === 'ordinal') {
		throw new Error('selectordinal has no pinned categories yet; add them to pluralCategories.ts')
	}
	const pinned = PLURAL_CATEGORIES[locale]
	if (!pinned) throw new Error(`No plural categories for ${locale}; add it to pluralCategories.ts`)
	return pinned
}

interface Signature {
	/** argument name -> element kinds it appears as (`argument`, `number`, `plural`, ...) */
	args: Map<string, Set<string>>
	tags: Set<string>
	choices: {
		kind: 'plural' | 'selectordinal' | 'select'
		name: string
		options: string[]
		emptyOptions: string[]
	}[]
}

const KIND: Partial<Record<TYPE, string>> = {
	[TYPE.argument]: 'argument',
	[TYPE.number]: 'number',
	[TYPE.date]: 'date',
	[TYPE.time]: 'time',
	[TYPE.select]: 'select',
	[TYPE.plural]: 'plural',
}

function signature(elements: MessageFormatElement[], sig: Signature = emptySignature()) {
	for (const el of elements) {
		if (el.type === TYPE.tag) {
			sig.tags.add(el.value)
			signature(el.children, sig)
			continue
		}
		const kind = KIND[el.type]
		if (!kind) continue
		const name = (el as { value: string }).value
		const kinds = sig.args.get(name) ?? new Set()
		kinds.add(kind)
		sig.args.set(name, kinds)
		if (el.type === TYPE.select || el.type === TYPE.plural) {
			const choiceKind =
				el.type === TYPE.select
					? 'select'
					: el.pluralType === 'ordinal'
						? 'selectordinal'
						: 'plural'
			const emptyOptions = Object.entries(el.options)
				.filter(([, option]) => isBlank(option.value))
				.map(([key]) => key)
			sig.choices.push({ kind: choiceKind, name, options: Object.keys(el.options), emptyOptions })
			for (const option of Object.values(el.options)) signature(option.value, sig)
		}
	}
	return sig
}

function isBlank(elements: MessageFormatElement[]) {
	return elements.every((el) => el.type === TYPE.literal && !el.value.trim())
}

// `{count}` inside a branch instead of `#`, or a plural that a locale without plural forms drops
// (or one that needs plurals adds), are both fine: the value is the same number either way.
const comparableKind = (kind: string) => (kind === 'plural' ? 'argument' : kind)

function emptySignature(): Signature {
	return { args: new Map(), tags: new Set(), choices: [] }
}

function tryParse(text: string): MessageFormatElement[] | string {
	try {
		return parse(text)
	} catch (e) {
		return (e as Error).message
	}
}

/**
 * Checks one translation against its English. Returns error messages; `warn` receives problems
 * that don't break rendering.
 */
export function checkMessage(
	locale: string,
	english: string,
	translation: string,
	warn: (message: string) => void = () => {}
): string[] {
	if (!translation.trim()) return ['empty translation']

	const sourceAst = tryParse(english)
	if (typeof sourceAst === 'string') return [`English does not parse as ICU: ${sourceAst}`]
	const targetAst = tryParse(translation)
	if (typeof targetAst === 'string') return [`does not parse as ICU: ${targetAst}`]

	const source = signature(sourceAst)
	const target = signature(targetAst)
	const errors: string[] = []

	for (const [name, kinds] of target.args) {
		const sourceKinds = source.args.get(name)
		if (!sourceKinds) {
			errors.push(`unknown argument {${name}} (renamed or translated?)`)
			continue
		}
		const comparable = new Set([...sourceKinds].map(comparableKind))
		for (const kind of kinds) {
			if (!comparable.has(comparableKind(kind)))
				errors.push(
					`{${name}} is used as ${kind}, English uses it as ${[...sourceKinds].join('/')}`
				)
		}
	}
	for (const name of source.args.keys()) {
		if (target.args.has(name)) continue
		// A lone apostrophe before `{` starts an ICU quoted span (French and Italian `l'{name}`),
		// which hides the argument.
		const hint = translation.includes("'{") ? ` (a single ' before { quotes it; write '')` : ''
		errors.push(`missing argument {${name}}${hint}`)
	}

	for (const tag of target.tags) {
		if (!source.tags.has(tag)) errors.push(`unknown tag <${tag}>`)
	}
	for (const tag of source.tags) {
		if (!target.tags.has(tag)) errors.push(`missing tag <${tag}>`)
	}

	for (const choice of target.choices) {
		const englishChoices = source.choices.filter(
			(c) => c.kind === choice.kind && c.name === choice.name
		)
		// Lokalise sends Google's `one`/`other` and leaves the forms Google didn't fill as `{}`, so
		// Polish with 2–4 items rendered nothing at all.
		for (const option of choice.emptyOptions) {
			if (!englishChoices.some((c) => c.emptyOptions.includes(option))) {
				errors.push(`${choice.kind} {${choice.name}} has an empty "${option}" form`)
			}
		}
		if (choice.kind === 'select') {
			// Select keys are values the code passes in, so they must match English exactly.
			const sourceOptions = new Set(englishChoices.flatMap((c) => c.options))
			for (const option of choice.options) {
				if (!sourceOptions.has(option))
					errors.push(`select {${choice.name}} has unknown option "${option}"`)
			}
			for (const option of sourceOptions) {
				if (!choice.options.includes(option))
					errors.push(`select {${choice.name}} is missing option "${option}"`)
			}
			continue
		}
		const type = choice.kind === 'selectordinal' ? 'ordinal' : 'cardinal'
		const { required, all } = pluralCategories(locale, type)
		for (const option of choice.options) {
			if (/^=\d+$/.test(option)) continue
			if (!CLDR_CATEGORIES.has(option)) {
				errors.push(
					`${choice.kind} {${choice.name}} has "${option}", which is not a plural category`
				)
			} else if (!all.includes(option)) {
				warn(`${choice.kind} {${choice.name}} has "${option}", which ${locale} never selects`)
			}
		}
		// English like `{count, plural, =1 {…} =2 {…} other {…}}` spells out exact values and leaves
		// the rest to `other`; its translations need the same shape, not the locale's categories.
		const englishUsesCategories = englishChoices.some((c) =>
			c.options.some((o) => o !== 'other' && CLDR_CATEGORIES.has(o))
		)
		for (const category of englishUsesCategories ? required : ['other']) {
			if (!choice.options.includes(category)) {
				errors.push(`${choice.kind} {${choice.name}} is missing the "${category}" form`)
			}
		}
	}

	const sourceForeign = new Set(english.match(FOREIGN_PLACEHOLDER) ?? [])
	for (const placeholder of translation.match(FOREIGN_PLACEHOLDER) ?? []) {
		if (!sourceForeign.has(placeholder)) errors.push(`non-ICU placeholder ${placeholder}`)
	}

	return errors
}

function readJson(file: string) {
	return JSON.parse(readFileSync(file, 'utf8'))
}

function messageText(project: I18nProject, value: unknown): string | undefined {
	if (project === 'sdk') return typeof value === 'string' ? value : undefined
	const translation = (value as { translation?: unknown } | undefined)?.translation
	return typeof translation === 'string' ? translation : undefined
}

export function problemId(problem: Pick<I18nProblem, 'project' | 'locale' | 'key'>) {
	return `${problem.project}:${problem.locale}:${problem.key}`
}

export function validateCatalogs(root: string): I18nValidationResult {
	const errors: I18nProblem[] = []
	const warnings: string[] = []
	let missingCount = 0

	const supported: string[] = readJson(path.join(root, 'assets/translations/languages.json'))
		.map((l: { locale: string }) => l.locale)
		.filter((l: string) => l !== 'en')

	for (const [project, config] of Object.entries(PROJECTS) as [
		I18nProject,
		(typeof PROJECTS)[I18nProject],
	][]) {
		const source: Record<string, unknown> = readJson(path.join(root, config.source))
		const directory = path.join(root, config.directory)

		for (const file of readdirSync(directory)) {
			if (!file.endsWith('.json')) continue
			const locale = file.slice(0, -'.json'.length)
			if (NON_LOCALE_FILES.has(locale) || locale.startsWith('xx-')) continue
			if (!supported.includes(locale)) {
				warnings.push(`${config.directory}/${file} is not in languages.json, so it is never loaded`)
			}
		}

		for (const locale of supported) {
			const file = path.join(directory, `${locale}.json`)
			if (!existsSync(file)) {
				errors.push({
					project,
					locale,
					key: '*',
					message: `missing catalog ${config.directory}/${locale}.json`,
				})
				continue
			}
			const target: Record<string, unknown> = readJson(file)
			for (const key of Object.keys(target)) {
				if (!Object.hasOwn(source, key)) {
					errors.push({ project, locale, key, message: 'key is not in the English catalog' })
				}
			}
			for (const [key, value] of Object.entries(source)) {
				const english = messageText(project, value)
				if (english === undefined) throw new Error(`Invalid English for ${project}/${key}`)
				if (!Object.hasOwn(target, key)) {
					missingCount++
					continue
				}
				const translation = messageText(project, target[key])
				if (translation === undefined) {
					errors.push({ project, locale, key, message: 'translation is not a string' })
					continue
				}
				const warn = (message: string) => warnings.push(`${project}:${locale}:${key}: ${message}`)
				for (const message of checkMessage(locale, english, translation, warn)) {
					errors.push({ project, locale, key, message })
				}
			}
		}
	}

	return { errors, warnings, missingCount }
}
