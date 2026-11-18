import { act } from '@testing-library/react'
import { computed, createShapeId, Editor, TLWriteRule } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

afterEach(() => editor?.dispose())

it('rechecks the write rule after an authorize prop change without recreating the store', async () => {
	const allow: TLWriteRule = () => null
	const deny: TLWriteRule = () => ({ reason: 'not now' })
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} authorize={{ rule: allow }} isChangePermitted="write-rule" />
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
	const store = editor.store
	const id = createShapeId('kept')
	act(() => {
		editor.createShape({ id, type: 'geo' })
	})
	const query = computed('can edit', () => {
		const shape = editor.getShape(id)!
		return editor.isChangePermitted({ type: 'update', prev: shape, next: shape })
	})
	expect(query.get()).toBe(true)
	await act(async () =>
		result.rendered.rerender(<Tldraw authorize={{ rule: deny }} isChangePermitted="write-rule" />)
	)
	expect(editor.store).toBe(store)
	expect(editor.getShape(id)).toBeDefined()
	expect(query.get()).toBe(false)
	await act(async () =>
		result.rendered.rerender(<Tldraw authorize={{ rule: allow }} isChangePermitted="write-rule" />)
	)
	expect(query.get()).toBe(true)
})
