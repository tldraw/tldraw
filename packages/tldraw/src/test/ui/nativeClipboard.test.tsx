import { act } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const ids = {
	box1: createShapeId('box1'),
}

function mockClipboard() {
	const write = vi.fn()
	Object.assign(window.navigator, {
		clipboard: {
			write,
			writeText: vi.fn(),
		},
	})
	globalThis.ClipboardItem = vi.fn(function (payload: any) {
		return payload
	}) as any
	return write
}

async function setupFocusedEditor() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	act(() => {
		editor.updateInstanceState({ isFocused: true })
	})

	return { editor }
}

function dispatchClipboardEvent(editor: Editor, type: 'copy' | 'cut') {
	const doc = editor.getContainerDocument()
	const event = new Event(type, { bubbles: true, cancelable: true })
	doc.dispatchEvent(event)
	return event
}

async function setupSelectedShape(editor: Editor) {
	act(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
	})
}

describe('useNativeClipboardEvents', () => {
	it('copies selected shapes when there is no text selection', async () => {
		const write = mockClipboard()
		const { editor } = await setupFocusedEditor()
		await setupSelectedShape(editor)

		await act(async () => {
			dispatchClipboardEvent(editor, 'copy')
			await Promise.resolve()
		})

		expect(write).toHaveBeenCalled()
	})

	it('does not copy selected shapes when there is an active text selection', async () => {
		const write = mockClipboard()
		const { editor } = await setupFocusedEditor()
		await setupSelectedShape(editor)

		const getSelectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({
			isCollapsed: false,
			toString: () => 'hello',
		} as Selection)

		const event = await act(async () => {
			const e = dispatchClipboardEvent(editor, 'copy')
			await Promise.resolve()
			return e
		})

		expect(write).not.toHaveBeenCalled()
		expect(event.defaultPrevented).toBe(false)

		getSelectionSpy.mockRestore()
	})

	it('cuts selected shapes when there is no text selection', async () => {
		const write = mockClipboard()
		const { editor } = await setupFocusedEditor()
		await setupSelectedShape(editor)

		await act(async () => {
			dispatchClipboardEvent(editor, 'cut')
			await Promise.resolve()
		})

		expect(write).toHaveBeenCalled()
		expect(editor.getCurrentPageShapeIds().has(ids.box1)).toBe(false)
	})

	it('does not cut selected shapes when there is an active text selection', async () => {
		const write = mockClipboard()
		const { editor } = await setupFocusedEditor()
		await setupSelectedShape(editor)

		const getSelectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({
			isCollapsed: false,
			toString: () => 'hello',
		} as Selection)

		const event = await act(async () => {
			const e = dispatchClipboardEvent(editor, 'cut')
			await Promise.resolve()
			return e
		})

		expect(write).not.toHaveBeenCalled()
		expect(event.defaultPrevented).toBe(false)
		expect(editor.getCurrentPageShapeIds().has(ids.box1)).toBe(true)

		getSelectionSpy.mockRestore()
	})
})
