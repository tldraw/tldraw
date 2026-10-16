import { readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { graphemes } from '../terminal/width'
import type { PromptSpec, PromptState } from './UiState'

export function createPromptState(spec: PromptSpec): PromptState {
	const value = spec.initial ?? ''
	return { spec, value, caret: graphemes(value).length, completions: [], completionIndex: -1 }
}

function withValue(state: PromptState, value: string, caret: number): PromptState {
	const n = graphemes(value).length
	return {
		...state,
		value,
		caret: Math.max(0, Math.min(n, caret)),
		completions: [],
		completionIndex: -1,
	}
}

export function promptInsert(state: PromptState, text: string): PromptState {
	if (text.length === 0) return state
	const clean = text.replace(/[\r\n]+/g, ' ')
	const parts = graphemes(state.value)
	const inserted = graphemes(clean)
	parts.splice(state.caret, 0, ...inserted)
	return withValue(state, parts.join(''), state.caret + inserted.length)
}

export function promptBackspace(state: PromptState): PromptState {
	if (state.caret === 0) return state
	const parts = graphemes(state.value)
	parts.splice(state.caret - 1, 1)
	return withValue(state, parts.join(''), state.caret - 1)
}

export function promptDeleteForward(state: PromptState): PromptState {
	const parts = graphemes(state.value)
	if (state.caret >= parts.length) return state
	parts.splice(state.caret, 1)
	return withValue(state, parts.join(''), state.caret)
}

export function promptMoveCaret(state: PromptState, delta: number): PromptState {
	return { ...state, caret: clampCaret(state, state.caret + delta) }
}

export function promptCaretToStart(state: PromptState): PromptState {
	return { ...state, caret: 0 }
}

export function promptCaretToEnd(state: PromptState): PromptState {
	return { ...state, caret: graphemes(state.value).length }
}

/** ctrl+u: clear everything before the caret. */
export function promptDeleteToStart(state: PromptState): PromptState {
	const parts = graphemes(state.value)
	return withValue(state, parts.slice(state.caret).join(''), 0)
}

/** ctrl+w: delete the word (or path segment) before the caret. */
export function promptDeleteWord(state: PromptState): PromptState {
	if (state.caret === 0) return state
	const parts = graphemes(state.value)
	let i = state.caret
	while (i > 0 && isSeparator(parts[i - 1])) i--
	while (i > 0 && !isSeparator(parts[i - 1])) i--
	parts.splice(i, state.caret - i)
	return withValue(state, parts.join(''), i)
}

function isSeparator(g: string): boolean {
	return g === ' ' || g === '/'
}

function clampCaret(state: PromptState, caret: number): number {
	return Math.max(0, Math.min(graphemes(state.value).length, caret))
}

export function expandHome(path: string, env: NodeJS.ProcessEnv): string {
	if (path === '~' || path.startsWith('~/')) {
		const home = env.HOME || homedir()
		return home + path.slice(1)
	}
	return path
}

export interface CompletionOptions {
	env: NodeJS.ProcessEnv
	cwd: string
}

/**
 * Filesystem completions for a partial path: entries of the containing directory whose names
 * start with the last segment. Directories end in `/`; dotfiles only show when asked for; a `~`
 * prefix is kept in the results. Returns [] when the directory cannot be read.
 */
export function listPathCompletions(value: string, opts: CompletionOptions): string[] {
	const slash = value.lastIndexOf('/')
	const dirPart = slash >= 0 ? value.slice(0, slash + 1) : ''
	const prefix = slash >= 0 ? value.slice(slash + 1) : value
	const dirPath = dirPart === '' ? opts.cwd : expandHome(dirPart, opts.env)
	let entries: Array<{ name: string; isDirectory(): boolean }>
	try {
		entries = readdirSync(dirPath, { withFileTypes: true })
	} catch {
		return []
	}
	const showHidden = prefix.startsWith('.')
	const out: string[] = []
	for (const entry of entries) {
		if (!entry.name.startsWith(prefix)) continue
		if (!showHidden && entry.name.startsWith('.')) continue
		out.push(dirPart + entry.name + (entry.isDirectory() ? '/' : ''))
	}
	out.sort()
	return out
}

function commonPrefix(items: readonly string[]): string {
	let prefix = items[0]
	for (let i = 1; i < items.length && prefix.length > 0; i++) {
		const s = items[i]
		let k = 0
		while (k < prefix.length && k < s.length && prefix[k] === s[k]) k++
		prefix = prefix.slice(0, k)
	}
	return prefix
}

/**
 * Tab: complete to the single match or the longest common prefix; when that makes no progress,
 * cycle through the candidates on each press. The candidates stay in `completions` so the status
 * row can list them.
 */
export function promptComplete(state: PromptState, opts: CompletionOptions): PromptState {
	if (state.completions.length > 1) {
		const index = (state.completionIndex + 1) % state.completions.length
		const value = state.completions[index]
		return {
			...state,
			value,
			caret: graphemes(value).length,
			completionIndex: index,
		}
	}
	const candidates = listPathCompletions(state.value, opts)
	if (candidates.length === 0) return { ...state, completions: [], completionIndex: -1 }
	if (candidates.length === 1) {
		return withValue(state, candidates[0], graphemes(candidates[0]).length)
	}
	const prefix = commonPrefix(candidates)
	if (prefix.length > state.value.length) {
		return {
			...state,
			value: prefix,
			caret: graphemes(prefix).length,
			completions: candidates,
			completionIndex: -1,
		}
	}
	return {
		...state,
		value: candidates[0],
		caret: graphemes(candidates[0]).length,
		completions: candidates,
		completionIndex: 0,
	}
}

/** Up/down through earlier answers to prompts with the same label; the draft is kept at the end. */
export class PromptHistory {
	private readonly entries = new Map<string, string[]>()

	constructor(private readonly limit = 50) {}

	push(label: string, value: string): void {
		if (value.length === 0) return
		let list = this.entries.get(label)
		if (!list) {
			list = []
			this.entries.set(label, list)
		}
		const existing = list.indexOf(value)
		if (existing >= 0) list.splice(existing, 1)
		list.push(value)
		if (list.length > this.limit) list.shift()
	}

	get(label: string): readonly string[] {
		return this.entries.get(label) ?? []
	}

	/** `delta` -1 goes to older entries, +1 to newer ones and finally back to the draft. */
	navigate(state: PromptState, delta: number): PromptState {
		const list = this.get(state.spec.label)
		if (list.length === 0) return state
		const current = state.historyIndex ?? list.length
		const draft = state.historyIndex === undefined ? state.value : (state.draft ?? '')
		const next = Math.max(0, Math.min(list.length, current + delta))
		if (next === current) return state
		const value = next === list.length ? draft : list[next]
		return {
			...withValue(state, value, graphemes(value).length),
			historyIndex: next === list.length ? undefined : next,
			draft,
		}
	}
}

/** Text of a prompt row: the label, the value and, for confirm prompts, the choices. */
export function promptLabelText(state: PromptState): string {
	const spec = state.spec
	if (spec.kind === 'confirm') {
		const choices = (spec.choices ?? []).map((c) => `${c.key}: ${c.label}`)
		choices.push('esc: cancel')
		return `${spec.label} (${choices.join(' · ')})`
	}
	return spec.label
}
