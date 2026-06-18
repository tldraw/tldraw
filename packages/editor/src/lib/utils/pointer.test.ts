import { tlenv } from '../globals/environment'
import { TestEditor } from '../test/TestEditor'
import { getPointerInfo } from './getPointerInfo'
import { isDirectDisplayPen, isSecondaryClickEvent } from './pointer'

const originalIsDarwin = tlenv.isDarwin

afterEach(() => {
	tlenv.isDarwin = originalIsDarwin
})

describe('isSecondaryClickEvent', () => {
	it('treats ctrl + left-click as a secondary click on macOS', () => {
		tlenv.isDarwin = true
		expect(isSecondaryClickEvent({ button: 0, ctrlKey: true, metaKey: false })).toBe(true)
	})

	it('does not treat ctrl + left-click as a secondary click off macOS', () => {
		tlenv.isDarwin = false
		expect(isSecondaryClickEvent({ button: 0, ctrlKey: true, metaKey: false })).toBe(false)
	})
})

describe('isDirectDisplayPen', () => {
	// Implicit capture is applied to the hit `target`, not the `currentTarget` the listener is bound
	// to, so the capture check must read from `target`.
	function fakeEvent(pointerType: string, targetHasCapture: boolean) {
		return {
			pointerType,
			pointerId: 1,
			target: {
				hasPointerCapture: (_id: number) => targetHasCapture,
			},
			// currentTarget never holds the implicit capture; it should be ignored.
			currentTarget: {
				hasPointerCapture: (_id: number) => false,
			},
		} as unknown as PointerEvent
	}

	it('treats a pen with implicit capture on the target as a direct-display pen', () => {
		expect(isDirectDisplayPen(fakeEvent('pen', true))).toBe(true)
	})

	it('treats a pen without implicit capture as indirect', () => {
		expect(isDirectDisplayPen(fakeEvent('pen', false))).toBe(false)
	})

	it('is never true for mouse or touch input', () => {
		expect(isDirectDisplayPen(fakeEvent('mouse', true))).toBe(false)
		expect(isDirectDisplayPen(fakeEvent('touch', true))).toBe(false)
	})
})

describe('ctrl + left-click on macOS fires as a right-click (regression)', () => {
	// Regression test for https://github.com/tldraw/tldraw/issues/8217
	// On macOS, a ctrl + left-click should be treated as a right-click
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	afterEach(() => {
		editor.dispose()
	})

	it('reports button 2 in the dispatched pointer info on macOS', () => {
		tlenv.isDarwin = true
		const event = new PointerEvent('pointerdown', { button: 0, ctrlKey: true })
		expect(getPointerInfo(editor, event).button).toBe(2)
	})

	it('stays button 0 for the same gesture off macOS', () => {
		tlenv.isDarwin = false
		const event = new PointerEvent('pointerdown', { button: 0, ctrlKey: true })
		expect(getPointerInfo(editor, event).button).toBe(0)
	})
})
