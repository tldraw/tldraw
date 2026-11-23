import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { Tldraw, TldrawProps } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

async function clickImageToolbarCrop(props: TldrawProps) {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw {...props} onMount={onMount} />,
		{ waitForPatterns: false }
	)

	const imageId = createShapeId()
	await act(async () => {
		editor.createShapes([{ id: imageId, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(imageId)
	})

	const button = document.querySelector('[data-testid="tool.image-crop"]') as HTMLElement
	await act(async () => button.click())
	return editor
}

it('crops through the crop-image action from the image toolbar', async () => {
	const onUiEvent = vi.fn()
	const editor = await clickImageToolbarCrop({ onUiEvent })
	expect(editor.getPath()).toBe('select.crop.idle')
	expect(onUiEvent).toHaveBeenCalledWith('crop-image', { source: 'image-toolbar' })
})

it('still crops from the image toolbar when overrides remove the crop-image action', async () => {
	const editor = await clickImageToolbarCrop({
		overrides: {
			actions(_editor, actions) {
				delete actions['crop-image']
				return actions
			},
		},
	})
	expect(editor.getPath()).toBe('select.crop.idle')
})
