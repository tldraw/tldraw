import type { Editor } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { CommentTool } from './comment-tool'
import { defaultCommentingOptions, getCommentingOptions, type CommentingOptions } from './options'
import { commitCommentMutation, openThreadId, pendingComment } from './state'

// The StateNode constructor doesn't call any editor methods, so a bare stub is enough to
// instantiate a configured tool and read its merged options.
function optionsOf(Tool: typeof CommentTool): CommentingOptions {
	return new Tool({} as Editor).options
}

describe('CommentTool.configure', () => {
	it('returns default options when unconfigured', () => {
		expect(new CommentTool({} as Editor).options).toEqual(defaultCommentingOptions)
	})

	it('merges overrides over the defaults', () => {
		const Tool = CommentTool.configure({ history: 'record', enableClustering: false })
		expect(optionsOf(Tool)).toEqual({
			...defaultCommentingOptions,
			history: 'record',
			enableClustering: false,
		})
	})

	it('layers chained configure calls', () => {
		const Tool = CommentTool.configure({ history: 'record' }).configure({ enableClustering: false })
		expect(optionsOf(Tool)).toEqual({
			...defaultCommentingOptions,
			history: 'record',
			enableClustering: false,
		})
	})

	it('does not mutate the base tool or the defaults', () => {
		CommentTool.configure({ history: 'record' })
		expect(new CommentTool({} as Editor).options).toEqual(defaultCommentingOptions)
		expect(defaultCommentingOptions.history).toBe('ignore')
	})
})

// A minimal editor stub: getCommentingOptions reads the comment tool's `options` off
// getStateDescendant, and commitCommentMutation forwards to run().
function stubEditor(options: CommentingOptions) {
	const runCalls: Array<{ history: unknown }> = []
	const editor = {
		getStateDescendant: () => ({ options }),
		run: (fn: () => void, opts: { history: unknown }) => {
			runCalls.push(opts)
			fn()
			return editor
		},
	} as unknown as Editor
	return { editor, runCalls }
}

describe('getCommentingOptions', () => {
	it('reads the tool options off the editor', () => {
		const options = { ...defaultCommentingOptions, history: 'record' } as CommentingOptions
		const { editor } = stubEditor(options)
		expect(getCommentingOptions(editor)).toBe(options)
	})

	it('falls back to defaults when the comment tool is absent', () => {
		const editor = { getStateDescendant: () => undefined } as unknown as Editor
		expect(getCommentingOptions(editor)).toBe(defaultCommentingOptions)
	})
})

describe('commitCommentMutation', () => {
	it('uses options.history for a mutation and returns the callback result', () => {
		const { editor, runCalls } = stubEditor({
			...defaultCommentingOptions,
			history: 'record',
		} as CommentingOptions)
		const result = commitCommentMutation(editor, () => 42)
		expect(result).toBe(42)
		expect(runCalls).toEqual([{ history: 'record' }])
	})

	it('uses dragHistory for a drag, falling back to history when unset', () => {
		const withDrag = stubEditor({
			...defaultCommentingOptions,
			history: 'ignore',
			dragHistory: 'record',
		} as CommentingOptions)
		commitCommentMutation(withDrag.editor, () => undefined, 'drag')
		expect(withDrag.runCalls).toEqual([{ history: 'record' }])

		const noDrag = stubEditor({
			...defaultCommentingOptions,
			history: 'ignore',
			dragHistory: undefined,
		} as CommentingOptions)
		commitCommentMutation(noDrag.editor, () => undefined, 'drag')
		expect(noDrag.runCalls).toEqual([{ history: 'ignore' }])
	})
})

describe('editor-scoped transient state', () => {
	it('keeps open-thread state independent per editor (multi-editor guard)', () => {
		const a = {} as Editor
		const b = {} as Editor
		openThreadId.set(a, 'thread:1')
		expect(openThreadId.get(a)).toBe('thread:1')
		expect(openThreadId.get(b)).toBe(null)
	})

	it('keeps pending-comment state independent per editor', () => {
		const a = {} as Editor
		const b = {} as Editor
		pendingComment.set(a, { anchor: { type: 'page' }, point: { x: 0, y: 0 } })
		expect(pendingComment.get(a)).not.toBe(null)
		expect(pendingComment.get(b)).toBe(null)
	})
})
