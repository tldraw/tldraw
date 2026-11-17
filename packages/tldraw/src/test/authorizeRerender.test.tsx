import { act } from '@testing-library/react'
import { Editor, TLPermission, computed, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// apps often build `authorize` inside a component, so each render passes a new object
it('keeps the editor and its history when an inline authorize changes', async () => {
	const app = (canCreatePage: boolean, onMount?: (editor: Editor) => void) => (
		<Tldraw
			hideUi
			onMount={onMount}
			authorize={{
				can: (permission: TLPermission) => canCreatePage || permission !== 'tl:page:create',
				write: (changes) =>
					canCreatePage || !changes.some((c) => c.type === 'delete') ? null : { reason: 'no' },
			}}
		/>
	)
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => app(true, onMount),
		{ waitForPatterns: false }
	)
	const id = createShapeId('a')
	act(() => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id, type: 'geo' })
	})
	const canCreatePage = computed('canCreatePage', () => editor.can('tl:page:create'))
	expect(canCreatePage.get()).toBe(true)

	rendered.rerender(app(false))

	expect({ disposed: editor.isDisposed, canCreatePage: canCreatePage.get() }).toEqual({
		disposed: false,
		canCreatePage: false,
	})
	act(() => editor.undo())
	expect(editor.getShape(id)).toBeDefined()
	editor.dispose()
})
