import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	PromptHistory,
	createPromptState,
	expandHome,
	listPathCompletions,
	promptBackspace,
	promptCaretToEnd,
	promptCaretToStart,
	promptComplete,
	promptDeleteForward,
	promptDeleteToStart,
	promptDeleteWord,
	promptInsert,
	promptLabelText,
	promptMoveCaret,
} from './prompt'
import type { PromptSpec } from './UiState'

const spec: PromptSpec = { kind: 'text', label: 'Name:', onSubmit() {} }

describe('prompt editing', () => {
	it('starts from the initial value with the caret at the end', () => {
		expect(createPromptState({ ...spec, initial: 'héllo' })).toEqual({
			spec: { ...spec, initial: 'héllo' },
			value: 'héllo',
			caret: 5,
			completions: [],
			completionIndex: -1,
		})
		expect(createPromptState(spec).value).toBe('')
	})

	it('inserts, deletes and moves by grapheme', () => {
		let s = createPromptState(spec)
		s = promptInsert(s, 'ab')
		s = promptInsert(s, '👍🏽')
		expect(s).toMatchObject({ value: 'ab👍🏽', caret: 3 })
		s = promptMoveCaret(s, -1)
		s = promptInsert(s, 'x')
		expect(s).toMatchObject({ value: 'abx👍🏽', caret: 3 })
		s = promptBackspace(s)
		expect(s).toMatchObject({ value: 'ab👍🏽', caret: 2 })
		s = promptDeleteForward(s)
		expect(s).toMatchObject({ value: 'ab', caret: 2 })
		s = promptDeleteForward(s)
		expect(s.value).toBe('ab')
		s = promptCaretToStart(s)
		expect(promptBackspace(s)).toBe(s)
		s = promptMoveCaret(s, 99)
		expect(s.caret).toBe(2)
		s = promptCaretToEnd(promptCaretToStart(s))
		expect(s.caret).toBe(2)
	})

	it('replaces newlines in inserted text with spaces', () => {
		expect(promptInsert(createPromptState(spec), 'a\r\nb\nc').value).toBe('a b c')
	})

	it('kills to the start and deletes words or path segments', () => {
		let s = promptInsert(createPromptState(spec), '/home/user/docs/plan')
		s = promptDeleteWord(s)
		expect(s.value).toBe('/home/user/docs/')
		s = promptDeleteWord(s)
		expect(s.value).toBe('/home/user/')
		s = promptInsert(s, 'two words')
		s = promptMoveCaret(s, -3)
		s = promptDeleteWord(s)
		expect(s).toMatchObject({ value: '/home/user/two rds', caret: 15 })
		s = promptDeleteToStart(s)
		expect(s).toMatchObject({ value: 'rds', caret: 0 })
	})

	it('renders labels with confirm choices', () => {
		expect(promptLabelText(createPromptState(spec))).toBe('Name:')
		expect(
			promptLabelText(
				createPromptState({
					kind: 'confirm',
					label: 'Save?',
					choices: [{ key: 'y', label: 'yes' }],
					onSubmit() {},
				})
			)
		).toBe('Save? (y: yes · esc: cancel)')
	})
})

describe('path completion', () => {
	let dir: string
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'tui-complete-'))
		writeFileSync(join(dir, 'alpha.tldr'), '')
		writeFileSync(join(dir, 'alphabet.tldr'), '')
		writeFileSync(join(dir, 'beta.tldr'), '')
		writeFileSync(join(dir, '.secret'), '')
		mkdirSync(join(dir, 'docs'))
	})
	afterEach(() => rmSync(dir, { recursive: true, force: true }))

	it('expands ~ with HOME', () => {
		expect(expandHome('~/x', { HOME: '/h' })).toBe('/h/x')
		expect(expandHome('~', { HOME: '/h' })).toBe('/h')
		expect(expandHome('~user/x', { HOME: '/h' })).toBe('~user/x')
		expect(expandHome('/abs', { HOME: '/h' })).toBe('/abs')
	})

	it('lists matching entries, directories with a slash, dotfiles on request', () => {
		const opts = { env: {}, cwd: dir }
		expect(listPathCompletions(`${dir}/a`, opts)).toEqual([
			`${dir}/alpha.tldr`,
			`${dir}/alphabet.tldr`,
		])
		expect(listPathCompletions(`${dir}/`, opts)).toEqual([
			`${dir}/alpha.tldr`,
			`${dir}/alphabet.tldr`,
			`${dir}/beta.tldr`,
			`${dir}/docs/`,
		])
		expect(listPathCompletions(`${dir}/.`, opts)).toEqual([`${dir}/.secret`])
		expect(listPathCompletions('b', opts)).toEqual(['beta.tldr'])
		expect(listPathCompletions(`${dir}/missing/x`, opts)).toEqual([])
		expect(listPathCompletions('~/d', { env: { HOME: dir }, cwd: '/' })).toEqual(['~/docs/'])
	})

	it('completes the common prefix, then cycles', () => {
		const opts = { env: {}, cwd: dir }
		let s = createPromptState({ kind: 'path', label: 'Open:', initial: 'al', onSubmit() {} })
		s = promptComplete(s, opts)
		expect(s).toMatchObject({ value: 'alpha', caret: 5, completionIndex: -1 })
		expect(s.completions).toEqual(['alpha.tldr', 'alphabet.tldr'])
		s = promptComplete(s, opts)
		expect(s).toMatchObject({ value: 'alpha.tldr', completionIndex: 0 })
		s = promptComplete(s, opts)
		expect(s).toMatchObject({ value: 'alphabet.tldr', completionIndex: 1 })
		s = promptComplete(s, opts)
		expect(s.value).toBe('alpha.tldr')
		// Typing clears the candidates, so the next Tab searches again.
		s = promptInsert(s, 'x')
		expect(s.completions).toEqual([])
		s = promptComplete(s, opts)
		expect(s).toMatchObject({ value: 'alpha.tldrx', completions: [] })
		s = promptComplete(
			createPromptState({ kind: 'path', label: 'Open:', initial: 'b', onSubmit() {} }),
			opts
		)
		expect(s).toMatchObject({ value: 'beta.tldr', caret: 9, completions: [] })
	})
})

describe('prompt history', () => {
	it('navigates older and newer entries per label and keeps the draft', () => {
		const history = new PromptHistory(3)
		history.push('Open:', 'a')
		history.push('Open:', 'b')
		history.push('Open:', 'a')
		history.push('Open:', 'c')
		history.push('Open:', 'd')
		history.push('Open:', '')
		expect(history.get('Open:')).toEqual(['a', 'c', 'd'])
		expect(history.get('Save as:')).toEqual([])

		let s = promptInsert(
			createPromptState({ kind: 'path', label: 'Open:', onSubmit() {} }),
			'draft'
		)
		s = history.navigate(s, -1)
		expect(s).toMatchObject({ value: 'd', historyIndex: 2, draft: 'draft' })
		s = history.navigate(s, -1)
		s = history.navigate(s, -1)
		s = history.navigate(s, -1)
		expect(s).toMatchObject({ value: 'a', historyIndex: 0 })
		s = history.navigate(s, 1)
		expect(s).toMatchObject({ value: 'c', historyIndex: 1 })
		s = history.navigate(s, 1)
		s = history.navigate(s, 1)
		expect(s).toMatchObject({ value: 'draft', caret: 5 })
		expect(s.historyIndex).toBeUndefined()
		expect(history.navigate(s, 1)).toBe(s)
		const other = createPromptState({ kind: 'path', label: 'Save as:', onSubmit() {} })
		expect(history.navigate(other, -1)).toBe(other)
	})
})
