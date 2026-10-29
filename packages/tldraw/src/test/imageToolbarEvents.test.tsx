import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

it('crops through the crop-image action from the image toolbar', async () => {
	const onUiEvent = vi.fn()
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} onUiEvent={onUiEvent} />,
		{ waitForPatterns: false }
	)

	const imageId = createShapeId()
	await act(async () => {
		editor.createShapes([{ id: imageId, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(imageId)
	})

	const button = document.querySelector('[data-testid="tool.image-crop"]') as HTMLElement
	await act(async () => button.click())

	expect(editor.getPath()).toBe('select.crop.idle')
	expect(onUiEvent).toHaveBeenCalledWith('crop-image', { source: 'image-toolbar' })
})

it('still crops from the image toolbar when overrides remove the crop-image action', async () => {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				overrides={{
					actions(_editor, actions) {
						delete actions['crop-image']
						return actions
					},
				}}
			/>
		),
		{ waitForPatterns: false }
	)

	const imageId = createShapeId()
	await act(async () => {
		editor.createShapes([{ id: imageId, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(imageId)
	})

	const button = document.querySelector('[data-testid="tool.image-crop"]') as HTMLElement
	await act(async () => button.click())

	expect(editor.getPath()).toBe('select.crop.idle')
})
