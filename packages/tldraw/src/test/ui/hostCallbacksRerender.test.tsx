import { act } from '@testing-library/react'
import { Editor, TLPermission, computed, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// Hosts often build `isPermitted` inside a component, so each render passes a new function.
it('keeps the editor and its history when `isPermitted` and `isChangePermitted` change identity', async () => {
	const app = (canCreatePage: boolean, onMount?: (editor: Editor) => void) => (
		<Tldraw
			onMount={onMount}
			isPermitted={(permission: TLPermission) => canCreatePage || permission !== 'tl:page:create'}
			isChangePermitted={(change) => canCreatePage || change.type !== 'delete'}
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
	// a cached answer must recompute when the callback changes, or `useValue` UI goes stale
	const canCreatePage = computed('canCreatePage', () => editor.isPermitted('tl:page:create'))
	expect(canCreatePage.get()).toBe(true)

	rendered.rerender(app(false))

	const shape = editor.getShape(id)!
	expect({
		disposed: editor.isDisposed,
		isPermitted: canCreatePage.get(),
		canDelete: editor.isChangePermitted({ type: 'delete', prev: shape, next: null }),
	}).toEqual({ disposed: false, isPermitted: false, canDelete: false })
	act(() => editor.undo())
	expect(editor.getShape(id)).toBeUndefined()
	editor.dispose()
})
