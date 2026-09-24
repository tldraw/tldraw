import { act } from '@testing-library/react'
import { Editor, GeoShapeGeoStyle } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor

function pressedToolValues() {
	const els = document.querySelectorAll(
		'.tlui-main-toolbar__tools [data-value][aria-pressed="true"]'
	)
	return [...els].map((el) => el.getAttribute('data-value')!)
}

beforeEach(async () => {
	;({ editor } = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	}))
})

it('keeps only the originating tool highlighted while the zoom tool masks itself', async () => {
	await act(async () => {
		editor.setCurrentTool('draw')
	})
	expect(pressedToolValues()).toEqual(['draw'])

	await act(async () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'draw.idle' })
	})
	expect(pressedToolValues()).toEqual(['draw'])
})

it('keeps only the originating geo variant highlighted while the zoom tool masks itself', async () => {
	await act(async () => {
		editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse')
		editor.setCurrentTool('geo')
	})
	expect(pressedToolValues()).toEqual(['ellipse'])

	// Tools with no geo variant used to match the zoom tool's empty shared styles and all light up
	await act(async () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'geo.idle' })
	})
	expect(pressedToolValues()).toEqual(['ellipse'])
})
