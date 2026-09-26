import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, Editor, TldrawOptions, TLImageShape } from '@tldraw/editor'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor
const onClipboardPasteRaw = vi.fn<NonNullable<TldrawOptions['onClipboardPasteRaw']>>(() => false)
const imageId = createShapeId('image') as TLImageShape['id']

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw options={{ onClipboardPasteRaw }} onMount={onMount} />,
		{
			waitForPatterns: false,
		}
	)
	editor = result.editor

	act(() => {
		editor.createShapes([{ id: imageId, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(imageId)
	})
})

afterEach(() => {
	editor?.dispose()
	onClipboardPasteRaw.mockClear()
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

describe('Pasting in crop mode', () => {
	it('handles the paste when the zoom slider has focus', async () => {
		const thumb = await enterCropMode()
		thumb.focus()
		expect(document.activeElement).toBe(thumb)

		fireEvent.paste(thumb)

		expect(onClipboardPasteRaw).toHaveBeenCalledTimes(1)
	})

	it('leaves the paste to a focused text input', async () => {
		await enterCropMode()
		const input = document.createElement('input')
		document.body.appendChild(input)
		input.focus()

		fireEvent.paste(input)

		expect(onClipboardPasteRaw).not.toHaveBeenCalled()
		input.remove()
	})
})
