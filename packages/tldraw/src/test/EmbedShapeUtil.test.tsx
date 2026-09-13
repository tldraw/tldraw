import { act } from '@testing-library/react'
import { Editor, TLShapeId, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor
let embedA: TLShapeId
let embedB: TLShapeId

function getIframe(id: TLShapeId) {
	const container = document.getElementById(id)
	expect(container).toBeTruthy()
	const iframe = container!.querySelector('iframe')
	expect(iframe).toBeTruthy()
	return iframe!
}

beforeEach(async () => {
	embedA = createShapeId('embedA')
	embedB = createShapeId('embedB')

	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	await act(async () => {
		editor.createShapes([
			{
				id: embedA,
				type: 'embed',
				x: 0,
				y: 0,
				props: { w: 200, h: 200, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
			},
			{
				id: embedB,
				type: 'embed',
				x: 300,
				y: 0,
				props: { w: 200, h: 200, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
			},
		])
	})
})

describe('EmbedShapeUtil interactivity', () => {
	it('keeps iframes non-interactive when nothing is being edited', () => {
		expect(getIframe(embedA).style.pointerEvents).toBe('none')
		expect(getIframe(embedB).style.pointerEvents).toBe('none')
	})

	it('only makes the editing embed interactive', async () => {
		await act(async () => {
			editor.setEditingShape(embedA)
		})

		expect(getIframe(embedA).style.pointerEvents).toBe('auto')
		expect(getIframe(embedB).style.pointerEvents).toBe('none')
	})

	it('keeps other embeds non-interactive while the pointer is over them', async () => {
		await act(async () => {
			editor.setEditingShape(embedA)
			editor.setHoveredShape(embedB)
		})

		expect(getIframe(embedA).style.pointerEvents).toBe('auto')
		expect(getIframe(embedB).style.pointerEvents).toBe('none')
	})

	it('keeps the editing embed interactive when the hovered shape goes stale', async () => {
		await act(async () => {
			editor.setEditingShape(embedA)
			editor.setHoveredShape(null)
		})

		expect(getIframe(embedA).style.pointerEvents).toBe('auto')
		expect(getIframe(embedB).style.pointerEvents).toBe('none')
	})
})
