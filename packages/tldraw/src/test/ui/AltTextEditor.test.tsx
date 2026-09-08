import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, Editor, TLImageShape } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor
const imageId = createShapeId('image')

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	act(() => {
		editor.createShape<TLImageShape>({
			id: imageId,
			type: 'image',
			x: 100,
			y: 100,
			props: { w: 200, h: 200 },
		})
		editor.markHistoryStoppingPoint('move image')
		editor.updateShape({ id: imageId, type: 'image', x: 300 })
		editor.select(imageId)
	})
})

describe('AltTextEditor', () => {
	it('undoes only the alt text change, not the action before it', async () => {
		fireEvent.click(await screen.findByTestId('tool.image-alt-text'))

		const input = (await screen.findByTestId('media-toolbar.alt-text-input')) as HTMLInputElement
		fireEvent.change(input, { target: { value: 'A picture' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(editor.getShape<TLImageShape>(imageId)).toMatchObject({
			x: 300,
			props: { altText: 'A picture' },
		})

		act(() => {
			editor.undo()
		})

		expect(editor.getShape<TLImageShape>(imageId)).toMatchObject({
			x: 300,
			props: { altText: '' },
		})
	})
})
