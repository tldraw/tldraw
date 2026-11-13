import { createShapeId, TLStoreAuthorize } from '@tldraw/editor'
import { vi } from 'vitest'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

const a = createShapeId('a')
const refuseAll: TLStoreAuthorize = {
	rule: () => ({ reason: 'no' }),
	getSession: () => ({
		sessionId: 's',
		userId: null,
		meta: undefined,
		access: { document: 'write', objects: 'write' },
		permissions: null,
	}),
}

function setup() {
	const editor = new TestEditor(
		{ isChangePermitted: () => false, isPermitted: () => false },
		{ authorize: refuseAll }
	)
	return editor
}
const denied = (editor: TestEditor) => ({
	write: (() => {
		editor.createShapes([{ id: a, type: 'geo' }])
		const refused = !editor.getShape(a)
		editor.deleteShapes([a])
		return refused
	})(),
	query: !editor.isChangePermitted({
		type: 'create',
		prev: null,
		next: { ...editor.getCurrentPage(), id: 'page:x' } as any,
	}),
	isPermitted: !editor.isPermitted('tl:page:create'),
})

describe('client permissions and the license', () => {
	it('are enforced with the permissions feature', () => {
		const editor = setup()
		fakeLicense(editor)
		expect(denied(editor)).toEqual({ write: true, query: true, isPermitted: true })
	})

	it('are enforced while the license is still being checked', () => {
		const editor = setup()
		fakeLicense(editor, { state: 'pending', permissions: false })
		expect(denied(editor)).toEqual({ write: true, query: true, isPermitted: true })
	})

	it('are ignored, with one warning, without the feature', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const editor = setup()
		fakeLicense(editor, { state: 'unlicensed', permissions: false })
		expect(denied(editor)).toEqual({ write: false, query: false, isPermitted: false })
		expect(denied(editor)).toEqual({ write: false, query: false, isPermitted: false })
		expect(warn.mock.calls.filter(([m]) => String(m).includes('permissions'))).toHaveLength(1)
		warn.mockRestore()
	})

	it('are ignored without a license manager (an editor outside <TldrawEditor />)', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const editor = setup()
		expect(denied(editor)).toEqual({ write: false, query: false, isPermitted: false })
	})

	it('follow the license once it resolves', () => {
		const editor = setup()
		const flags = fakeLicense(editor, { state: 'licensed', permissions: false })
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		expect(denied(editor).isPermitted).toBe(false)
		flags.set({ permissions: true })
		expect(denied(editor).isPermitted).toBe(true)
	})

	it('never lift readonly', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const editor = setup()
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.isPermitted('tl:page:create')).toBe(false)
	})
})
