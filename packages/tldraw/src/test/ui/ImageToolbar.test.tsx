import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, Editor, TLImageShape } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor
const imageId = createShapeId('image') as TLImageShape['id']

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	act(() => {
		editor.createShapes([{ id: imageId, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(imageId)
	})
})

afterEach(() => {
	editor?.dispose()
})

async function enterCropMode() {
	act(() => {
		editor.setCroppingShape(imageId)
		editor.setCurrentTool('select.crop.idle')
	})
	const slider = await screen.findByTestId('tool.image-zoom')
	return slider.querySelector('.tlui-slider__thumb') as HTMLElement
}

describe('Image toolbar in crop mode', () => {
	it('keeps the image selected when Escape is pressed on the zoom slider', async () => {
		const thumb = await enterCropMode()

		act(() => {
			fireEvent.keyDown(thumb, { key: 'Escape' })
		})

		expect(editor.getCroppingShapeId()).toBe(null)
		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([imageId])
	})

	it('keeps the image selected when Enter is pressed on the zoom slider', async () => {
		const thumb = await enterCropMode()

		act(() => {
			fireEvent.keyDown(thumb, { key: 'Enter' })
		})

		expect(editor.getCroppingShapeId()).toBe(null)
		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([imageId])
	})
})
