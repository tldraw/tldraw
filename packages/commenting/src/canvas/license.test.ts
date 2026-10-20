import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLCommentThread,
	toRichText,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerCommentAnchorLifecycle } from './anchor-lifecycle'
import { putCommentRecords } from './comment-mutations'
import { getCommentThreads } from './comment-store'
import { CommentTool } from './comment-tool'
import { canRunCommenting } from './license'

/**
 * Every gate here would be a no-op in development, where the license grants every feature, so each
 * test says what validation resolved to rather than leaving it to the environment.
 *
 * `warnOnce` dedupes for the life of the module, so only the first test to reach a given gate sees
 * its warning — which is why the one assertion on the output lives in that test.
 */

let editors: Editor[] = []

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	vi.restoreAllMocks()
})

type LicenseState = 'licensed' | 'unlicensed' | 'pending'

function setLicenseState(editor: Editor, license: LicenseState) {
	editor.getLicenseManager().state.set(license === 'pending' ? 'pending' : 'licensed')
	editor.getLicenseManager().featureFlags.set({
		collaboration: license === 'licensed',
		commenting: license === 'licensed',
	})
}

let nextLicenseKey = 0

function makeEditor(license: LicenseState) {
	// A key per editor: managers are shared per key, so keyless editors would all share one and a
	// test flipping its own editor's license would flip every other editor's too.
	const editor = new Editor({
		licenseKey: `test-license-key-${nextLicenseKey++}`,
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, CommentTool],
		getContainer: () => document.body,
	})
	editors.push(editor)
	setLicenseState(editor, license)
	return editor
}

function makeThread(
	editor: Editor,
	anchor: TLCommentThread['anchor'] = { type: 'point', x: 0, y: 0 }
) {
	const thread = createCommentThread({
		pageId: editor.getCurrentPageId(),
		anchor,
		createdBy: 'me',
	})
	const comment = createComment({
		threadId: thread.id,
		pageId: thread.pageId,
		authorId: 'me',
		body: toRichText('hello'),
	})
	return { thread, records: [thread, comment] }
}

describe('canRunCommenting', () => {
	it('is true when commenting is licensed', () => {
		expect(canRunCommenting(makeEditor('licensed'))).toBe(true)
	})

	it('is false once validation resolves without the commenting feature', () => {
		expect(canRunCommenting(makeEditor('unlicensed'))).toBe(false)
	})

	it('is true while validation is pending, since a one-shot call gets no second chance', () => {
		expect(canRunCommenting(makeEditor('pending'))).toBe(true)
	})
})

describe('comment writes', () => {
	it('write nothing without a commenting license, and say so once', () => {
		const warn = vi.spyOn(console, 'warn')
		const editor = makeEditor('unlicensed')
		putCommentRecords(editor, makeThread(editor).records)
		expect(getCommentThreads(editor)).toEqual([])
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toMatch(/commenting isn't licensed/)
	})

	it('go through while validation is pending', () => {
		const editor = makeEditor('pending')
		putCommentRecords(editor, makeThread(editor).records)
		expect(getCommentThreads(editor)).toHaveLength(1)
	})

	it('stop when validation resolves unlicensed mid-session', () => {
		const editor = makeEditor('pending')
		putCommentRecords(editor, makeThread(editor).records)
		setLicenseState(editor, 'unlicensed')
		putCommentRecords(editor, makeThread(editor).records)
		expect(getCommentThreads(editor)).toHaveLength(1)
	})
})

describe('the comment tool', () => {
	it('hands itself back to select without a commenting license', async () => {
		const editor = makeEditor('unlicensed')
		editor.setCurrentTool(CommentTool.id)
		await vi.waitFor(() => expect(editor.getCurrentToolId()).toBe('select'))
	})

	it('stays active while validation is pending, and leaves if it resolves unlicensed', async () => {
		const editor = makeEditor('pending')
		editor.setCurrentTool(CommentTool.id)
		expect(editor.getCurrentToolId()).toBe(CommentTool.id)

		setLicenseState(editor, 'unlicensed')
		await vi.waitFor(() => expect(editor.getCurrentToolId()).toBe('select'))
	})

	it('stays active when commenting is licensed', async () => {
		const editor = makeEditor('licensed')
		editor.setCurrentTool(CommentTool.id)
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(editor.getCurrentToolId()).toBe(CommentTool.id)
	})
})

describe('the anchor lifecycle', () => {
	it('stops maintaining anchors when validation resolves unlicensed', () => {
		const editor = makeEditor('pending')
		registerCommentAnchorLifecycle(editor)
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0 })
		const { thread, records } = makeThread(editor, {
			type: 'shape',
			shapeId,
			x: 0.5,
			y: 0.5,
			isPrecise: true,
		})
		putCommentRecords(editor, records)

		setLicenseState(editor, 'unlicensed')
		editor.deleteShape(shapeId)

		// Licensed, the thread would outlive its shape as a point anchor. Unlicensed, the conversion
		// is refused like any other comment write and the record is left exactly as it was.
		expect(getCommentThreads(editor)[0].anchor).toEqual(thread.anchor)
	})
})
