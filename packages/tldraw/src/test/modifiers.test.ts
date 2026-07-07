import { TLKeyboardEventInfo } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

vi.useFakeTimers()

it('Shift Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { shiftKey: true })
	editor.pointerMove(100, 100, { shiftKey: false })
	expect(editor.inputs.getShiftKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getShiftKey()).toBe(false)
})

it('Alt Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { altKey: true })
	editor.pointerMove(100, 100, { altKey: false })
	expect(editor.inputs.getAltKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getAltKey()).toBe(false)
})

it('Ctrl Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { ctrlKey: true })
	editor.pointerMove(100, 100, { ctrlKey: false })
	expect(editor.inputs.getCtrlKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getCtrlKey()).toBe(false)
})

it('pointer down releases a modifier still in its debounce window', () => {
	// Collect any synthetic key_up events fired by the release-debounce timers.
	const keyUps: string[] = []
	editor.on('event', (info) => {
		if (info.type === 'keyboard' && info.name === 'key_up') keyUps.push(info.key)
	})

	// Hold then release meta via pointer events; the release is debounced for 150ms.
	editor.pointerMove(100, 100, { metaKey: true })
	editor.pointerMove(100, 100, { metaKey: false })
	expect(editor.inputs.getMetaKey()).toBe(true) // still held during the debounce window

	// A new interaction starts with the key physically up: the lingering modifier
	// should be treated as released immediately, without waiting for the timeout.
	editor.pointerDown(100, 100, { metaKey: false })
	expect(editor.inputs.getMetaKey()).toBe(false)

	// The pending timer must have been cancelled: advancing past it should not flip
	// state back nor fire the timer's synthetic key_up.
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getMetaKey()).toBe(false)
	expect(keyUps).not.toContain('Meta')
})

it('pointer down releases every modifier still in its debounce window', () => {
	const keyUps: string[] = []
	editor.on('event', (info) => {
		if (info.type === 'keyboard' && info.name === 'key_up') keyUps.push(info.key)
	})

	editor.pointerMove(100, 100, { shiftKey: true, altKey: true, ctrlKey: true, metaKey: true })
	editor.pointerMove(100, 100, { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false })
	expect(editor.inputs.getShiftKey()).toBe(true)
	expect(editor.inputs.getAltKey()).toBe(true)
	expect(editor.inputs.getCtrlKey()).toBe(true)
	expect(editor.inputs.getMetaKey()).toBe(true)

	editor.pointerDown(100, 100, { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false })
	expect(editor.inputs.getShiftKey()).toBe(false)
	expect(editor.inputs.getAltKey()).toBe(false)
	expect(editor.inputs.getCtrlKey()).toBe(false)
	expect(editor.inputs.getMetaKey()).toBe(false)

	// All four timers were cancelled, so nothing flips back or fires a synthetic key_up.
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getShiftKey()).toBe(false)
	expect(editor.inputs.getAltKey()).toBe(false)
	expect(editor.inputs.getCtrlKey()).toBe(false)
	expect(editor.inputs.getMetaKey()).toBe(false)
	expect(keyUps).toEqual([])
})

it('pointer down keeps a genuinely held modifier', () => {
	// Shift is actually held during the pointer down (flag stays true), so it must
	// not be cleared by the debounce-flush.
	editor.pointerMove(100, 100, { shiftKey: true })
	expect(editor.inputs.getShiftKey()).toBe(true)
	editor.pointerDown(100, 100, { shiftKey: true })
	expect(editor.inputs.getShiftKey()).toBe(true)
})

it('keyboard events carry currently-held modifiers', () => {
	const keyboardEvents: TLKeyboardEventInfo[] = []
	editor.on('event', (info) => {
		if (info.type === 'keyboard') keyboardEvents.push(info)
	})

	editor.keyDown('Control')
	editor.keyDown('Shift') // pressed while Control is still held

	// like a real DOM keyboard event, the Shift keydown reports Control as held
	const shiftDown = keyboardEvents.find((e) => e.key === 'Shift' && e.name === 'key_down')!
	expect(shiftDown.shiftKey).toBe(true)
	expect(shiftDown.ctrlKey).toBe(true)
})
