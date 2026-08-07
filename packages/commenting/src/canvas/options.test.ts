import { createComment, createCommentThread, toRichText, type Editor, type TLPageId } from 'tldraw'
import { describe, expect, it, vi } from 'vitest'
import { commitCommentMutation } from './comment-mutations'
import { CommentTool } from './comment-tool'
import {
	defaultCanModifyComment,
	defaultCommentingOptions,
	getCanComment,
	getCanModifyComment,
	getCommentingOptions,
	type CommentingOptions,
	type CommentModificationContext,
} from './options'
import { openThreadId, pendingComment } from './state'

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

	it('layers component slots across chained configure calls', () => {
		const CommentBody = () => null
		const PinContent = () => null
		const Tool = CommentTool.configure({ components: { CommentBody } }).configure({
			components: { PinContent },
		})
		// The second call's slot is added without dropping the first call's slot.
		expect(optionsOf(Tool).components).toEqual({ CommentBody, PinContent })
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

describe('getCanComment', () => {
	it('defaults to requiring a current user', () => {
		const { editor } = stubEditor(defaultCommentingOptions)
		expect(getCanComment(editor, 'alice')).toBe(true)
		expect(getCanComment(editor, null)).toBe(false)
		expect(getCanComment(editor, undefined)).toBe(false)
	})

	it('normalizes an undefined viewer to null for the callback', () => {
		const calls: Array<string | null> = []
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canComment: (ctx) => {
				calls.push(ctx.currentUserId)
				return false
			},
		})
		getCanComment(editor, undefined)
		expect(calls).toEqual([null])
	})

	it('delegates to the canComment callback, passing the editor and viewer', () => {
		const calls: Array<{ editor: Editor; currentUserId: string | null }> = []
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canComment: (ctx) => {
				calls.push(ctx)
				return ctx.currentUserId === 'alice'
			},
		})
		expect(getCanComment(editor, 'alice')).toBe(true)
		expect(getCanComment(editor, 'bob')).toBe(false)
		expect(calls).toEqual([
			{ editor, currentUserId: 'alice' },
			{ editor, currentUserId: 'bob' },
		])
	})

	it('lets the callback fully replace the signed-in default', () => {
		const { editor } = stubEditor({ ...defaultCommentingOptions, canComment: () => true })
		expect(getCanComment(editor, null)).toBe(true)
	})

	// This is read during render, so a throwing host rule would take the comments layer with it.
	it('denies rather than throws when the callback throws', () => {
		const onError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canComment: () => {
				throw new Error('lookup failed')
			},
		})
		expect(getCanComment(editor, 'alice')).toBe(false)
		expect(onError).toHaveBeenCalled()
		onError.mockRestore()
	})
})

// Plain records for the permission checks — the factories are pure, so no store is involved.
const PAGE_ID = 'page:test' as TLPageId

function makeThread(createdBy: string) {
	return createCommentThread({
		pageId: PAGE_ID,
		anchor: { type: 'point', x: 0, y: 0 },
		createdBy,
	})
}

function makeComment(authorId: string) {
	return createComment({
		threadId: makeThread(authorId).id,
		pageId: PAGE_ID,
		authorId,
		body: toRichText('hello'),
	})
}

describe('getCanModifyComment', () => {
	it('defaults to the record owner: the comment author edits and deletes', () => {
		const { editor } = stubEditor(defaultCommentingOptions)
		const comment = makeComment('alice')
		expect(getCanModifyComment(editor, 'alice', { action: 'edit-comment', comment })).toBe(true)
		expect(getCanModifyComment(editor, 'alice', { action: 'delete-comment', comment })).toBe(true)
		expect(getCanModifyComment(editor, 'bob', { action: 'edit-comment', comment })).toBe(false)
		expect(getCanModifyComment(editor, 'bob', { action: 'delete-comment', comment })).toBe(false)
	})

	it('defaults to the thread creator for a thread delete', () => {
		const { editor } = stubEditor(defaultCommentingOptions)
		const thread = makeThread('alice')
		expect(getCanModifyComment(editor, 'alice', { action: 'delete-thread', thread })).toBe(true)
		expect(getCanModifyComment(editor, 'bob', { action: 'delete-thread', thread })).toBe(false)
	})

	it('withholds everything from a viewer with no identity', () => {
		const { editor } = stubEditor(defaultCommentingOptions)
		const comment = makeComment('alice')
		const thread = makeThread('alice')
		expect(getCanModifyComment(editor, null, { action: 'edit-comment', comment })).toBe(false)
		expect(getCanModifyComment(editor, undefined, { action: 'delete-comment', comment })).toBe(
			false
		)
		expect(getCanModifyComment(editor, null, { action: 'delete-thread', thread })).toBe(false)
	})

	it('passes the editor, the viewer, and the targeted write to the callback', () => {
		const calls: CommentModificationContext[] = []
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canModifyComment: (ctx) => {
				calls.push(ctx)
				return true
			},
		})
		const comment = makeComment('alice')
		getCanModifyComment(editor, undefined, { action: 'delete-comment', comment })
		// An undefined viewer normalizes to null, as it does for `canComment`.
		expect(calls).toEqual([{ editor, currentUserId: null, action: 'delete-comment', comment }])
	})

	it("lets a callback widen the default: a moderator deleting anyone's comment", () => {
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canModifyComment: (ctx) =>
				(ctx.action !== 'edit-comment' && ctx.currentUserId === 'mod') ||
				defaultCanModifyComment(ctx),
		})
		const comment = makeComment('alice')
		const thread = makeThread('alice')
		expect(getCanModifyComment(editor, 'mod', { action: 'delete-comment', comment })).toBe(true)
		expect(getCanModifyComment(editor, 'mod', { action: 'delete-thread', thread })).toBe(true)
		// Widening deletion doesn't hand the moderator anyone else's edit affordance.
		expect(getCanModifyComment(editor, 'mod', { action: 'edit-comment', comment })).toBe(false)
		// The author keeps their own affordances.
		expect(getCanModifyComment(editor, 'alice', { action: 'edit-comment', comment })).toBe(true)
		// Everyone else still gets nothing.
		expect(getCanModifyComment(editor, 'bob', { action: 'delete-comment', comment })).toBe(false)
	})

	it('lets a callback narrow the default', () => {
		const { editor } = stubEditor({ ...defaultCommentingOptions, canModifyComment: () => false })
		const comment = makeComment('alice')
		expect(getCanModifyComment(editor, 'alice', { action: 'edit-comment', comment })).toBe(false)
	})

	// A throw withholds the affordance rather than the whole layer, and never offers a write a
	// server enforcing the same rule would reject anyway.
	it('denies rather than throws when the callback throws', () => {
		const onError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor } = stubEditor({
			...defaultCommentingOptions,
			canModifyComment: () => {
				throw new Error('lookup failed')
			},
		})
		const comment = makeComment('alice')
		expect(getCanModifyComment(editor, 'alice', { action: 'edit-comment', comment })).toBe(false)
		expect(onError).toHaveBeenCalled()
		onError.mockRestore()
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
