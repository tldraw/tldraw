import { act, render, screen } from '@testing-library/react'
import { Editor, useEditor } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'

const ids = new WeakMap<Editor, string>()

it('opens on right-click', async () => {
	function Test() {
		const editor = useEditor()
		let id = ids.get(editor)
		if (!id) {
			id = Math.random().toString()
			ids.set(editor, id)
		}
		// console.log('render test', id)
		return null
	}
	await act(async () => {
		render(
			<Tldraw>
				<div data-testid="canvas-1" />
				<Test />
			</Tldraw>
		)
		// await screen.findByTestId('canvas-1')
	})
	await screen.findByTestId('canvas-1')
	await screen.findByTestId('hash_pattern_zoom_1_light')
	// await act(async () => await waitFor(() => screen.getByTestId('canvas-1')))
})
