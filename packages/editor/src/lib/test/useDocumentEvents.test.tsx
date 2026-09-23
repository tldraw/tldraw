import { act, cleanup, render } from '@testing-library/react'
import { vi } from 'vitest'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { TLKeyboardEventInfo } from '../editor/types/event-types'
import { TL_CONTAINER_CLASS, TldrawEditor } from '../TldrawEditor'

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

function keyUp(container: HTMLElement, init: KeyboardEventInit) {
	act(() => {
		container.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, ...init }))
	})
}

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

describe('useDocumentEvents meta release', () => {
	afterEach(() => {
		cleanup()
	})

	// macOS swallows the keyup of every non-modifier key pressed while Meta is held, so the
	// arrow from a Cmd+Arrow shortcut stayed held and the next plain arrow nudged diagonally.
	it('releases keys whose keyup macOS swallowed while Meta was held', async () => {
		const { editor, container } = await renderEditor()

		keyDown(container, { key: 'Meta', code: 'MetaLeft', metaKey: true })
		keyDown(container, { key: 'ArrowUp', code: 'ArrowUp', metaKey: true })
		expect([...editor.inputs.keys]).toEqual(['MetaLeft', 'ArrowUp'])

		// no keyup for ArrowUp ever arrives
		keyUp(container, { key: 'Meta', code: 'MetaLeft' })
		expect([...editor.inputs.keys]).toEqual([])
	})

	it('releases through a key_up that tools can match on key', async () => {
		const { editor, container } = await renderEditor()
		const keyUps: TLKeyboardEventInfo[] = []
		editor.on('event', (info) => {
			if (info.type === 'keyboard' && info.name === 'key_up') keyUps.push(info)
		})

		keyDown(container, { key: 'Meta', code: 'MetaLeft', metaKey: true })
		keyDown(container, { key: 'a', code: 'KeyA', metaKey: true })
		keyUp(container, { key: 'Meta', code: 'MetaLeft' })

		expect(keyUps.map((info) => [info.key, info.code])).toEqual([
			['Meta', 'MetaLeft'],
			['a', 'KeyA'],
		])
	})

	it('leaves other modifiers held, since their keyup is still delivered', async () => {
		const { editor, container } = await renderEditor()

		keyDown(container, { key: 'Shift', code: 'ShiftLeft', shiftKey: true })
		keyDown(container, { key: 'Meta', code: 'MetaLeft', shiftKey: true, metaKey: true })
		keyUp(container, { key: 'Meta', code: 'MetaLeft', shiftKey: true })

		expect([...editor.inputs.keys]).toEqual(['ShiftLeft'])
	})

	it('does not disturb keys held without Meta', async () => {
		const { editor, container } = await renderEditor()

		keyDown(container, { key: 'ArrowUp', code: 'ArrowUp' })
		keyUp(container, { key: 'ArrowUp', code: 'ArrowUp' })
		keyDown(container, { key: 'ArrowRight', code: 'ArrowRight' })

		expect([...editor.inputs.keys]).toEqual(['ArrowRight'])
	})
})
