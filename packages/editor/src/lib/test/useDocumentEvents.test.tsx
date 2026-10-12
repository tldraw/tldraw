import { act, cleanup, render } from '@testing-library/react'
import { vi } from 'vitest'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { TLKeyboardEventInfo } from '../editor/types/event-types'
import { TL_CONTAINER_CLASS, TldrawEditor } from '../TldrawEditor'

describe('useDocumentEvents drop handling', () => {
	// The container's native drop listener used to stop propagation before the event reached
	// React's root, so React onDrop handlers inside the canvas never fired.
	it('lets a drop inside the canvas reach React drop handlers there', async () => {
		const onDrop = vi.fn((e: React.DragEvent) => e.stopPropagation())
		function DropTarget() {
			return <div data-testid="drop-target" onDrop={onDrop} />
		}
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} components={{ OnTheCanvas: DropTarget }} />)
		})

		const target = document.querySelector('[data-testid="drop-target"]')!
		expect(target.closest('.tl-canvas')).not.toBeNull()
		const event = new Event('drop', { bubbles: true, cancelable: true })
		Object.defineProperty(event, 'dataTransfer', { value: { files: [], getData: () => '' } })
		act(() => {
			target.dispatchEvent(event)
		})

		expect(onDrop).toHaveBeenCalledTimes(1)
		// the browser default (navigating to the dropped file) is still prevented
		expect(event.defaultPrevented).toBe(true)
	})
})

describe('useDocumentEvents window blur', () => {
	async function renderEditor() {
		let editor!: Editor
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} autoFocus onMount={(e) => void (editor = e)} />)
		})
		const container = document.querySelector<HTMLElement>(`.${TL_CONTAINER_CLASS}`)!
		return { editor, container }
	}

	function keyDown(container: HTMLElement, init: KeyboardEventInit) {
		act(() => {
			container.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
		})
	}

	function blurWindow() {
		act(() => {
			window.dispatchEvent(new Event('blur'))
		})
	}

	afterEach(() => {
		cleanup()
	})

	// Alt+Tab / Cmd+Tab while holding Space: the keyup goes to the other app, so the editor
	// used to stay in spacebar panning mode with the grab cursor until Space was pressed again.
	it('ends spacebar panning and restores the cursor', async () => {
		const { editor, container } = await renderEditor()
		editor.setCursor({ type: 'cross', rotation: 0 })

		keyDown(container, { key: ' ', code: 'Space' })
		expect(editor.inputs.keys.has('Space')).toBe(true)
		expect(editor.inputs.getIsSpacebarPanning()).toBe(true)
		expect(editor.inputs.getIsPanning()).toBe(true)
		expect(editor.getInstanceState().cursor.type).toBe('grab')

		blurWindow()
		expect(editor.inputs.keys.has('Space')).toBe(false)
		expect(editor.inputs.getIsSpacebarPanning()).toBe(false)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.getInstanceState().cursor.type).toBe('cross')
	})

	it('releases every held key through a key_up that tools can match on key', async () => {
		const { editor, container } = await renderEditor()
		const keyUps: TLKeyboardEventInfo[] = []
		editor.on('event', (info) => {
			if (info.type === 'keyboard' && info.name === 'key_up') keyUps.push(info)
		})

		keyDown(container, { key: 'ArrowLeft', code: 'ArrowLeft' })
		keyDown(container, { key: 'a', code: 'KeyA' })
		expect([...editor.inputs.keys]).toEqual(['ArrowLeft', 'KeyA'])

		blurWindow()
		expect(editor.inputs.keys.size).toBe(0)
		expect(keyUps.map((info) => [info.key, info.code])).toEqual([
			['ArrowLeft', 'ArrowLeft'],
			['a', 'KeyA'],
		])
	})

	it('does nothing when no keys are held', async () => {
		const { editor } = await renderEditor()
		const onEvent = vi.fn()
		editor.on('event', onEvent)
		blurWindow()
		expect(onEvent).not.toHaveBeenCalled()
	})
})
