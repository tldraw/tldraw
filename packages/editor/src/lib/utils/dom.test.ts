import { vi } from 'vitest'
import { TestEditor } from '../test/TestEditor'
import { debugFlags, pointerCaptureTrackingObject } from './debug-flags'
import {
	activeElementShouldCaptureKeys,
	elementShouldCaptureKeys,
	getGlobalDocument,
	getGlobalWindow,
	loopToHtmlElement,
	moveElementInto,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	setStyleProperty,
	stopEventPropagation,
} from './dom'

describe('Event handling utilities', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	afterEach(() => {
		editor.dispose()
	})
	describe('markEventAsHandled and wasEventAlreadyHandled', () => {
		it('should track events as handled', () => {
			const mockEvent = new PointerEvent('pointerdown', { pointerId: 1 })

			// Initially, event should not be marked as handled
			expect(editor.wasEventAlreadyHandled(mockEvent)).toBe(false)

			// Mark the event as handled
			editor.markEventAsHandled(mockEvent)

			// Now it should be marked as handled
			expect(editor.wasEventAlreadyHandled(mockEvent)).toBe(true)
		})

		it('should work with React synthetic events', () => {
			const nativeEvent = new PointerEvent('pointerdown', { pointerId: 1 })
			const syntheticEvent = { nativeEvent }

			// Initially not handled
			expect(editor.wasEventAlreadyHandled(syntheticEvent)).toBe(false)
			expect(editor.wasEventAlreadyHandled(nativeEvent)).toBe(false)

			// Mark synthetic event as handled
			editor.markEventAsHandled(syntheticEvent)

			// Both synthetic and native should be marked as handled
			expect(editor.wasEventAlreadyHandled(syntheticEvent)).toBe(true)
			expect(editor.wasEventAlreadyHandled(nativeEvent)).toBe(true)
		})

		it('should handle multiple different events independently', () => {
			const event1 = new PointerEvent('pointerdown', { pointerId: 1 })
			const event2 = new PointerEvent('pointerup', { pointerId: 2 })
			const event3 = new MouseEvent('click')

			// Mark only event1 as handled
			editor.markEventAsHandled(event1)

			expect(editor.wasEventAlreadyHandled(event1)).toBe(true)
			expect(editor.wasEventAlreadyHandled(event2)).toBe(false)
			expect(editor.wasEventAlreadyHandled(event3)).toBe(false)

			// Mark event2 as handled
			editor.markEventAsHandled(event2)

			expect(editor.wasEventAlreadyHandled(event1)).toBe(true)
			expect(editor.wasEventAlreadyHandled(event2)).toBe(true)
			expect(editor.wasEventAlreadyHandled(event3)).toBe(false)
		})

		it('should not interfere with event properties', () => {
			const event = new PointerEvent('pointerdown', {
				pointerId: 1,
				clientX: 100,
				clientY: 200,
			})

			// Mark as handled
			editor.markEventAsHandled(event)

			// Event properties should remain unchanged
			expect(event.pointerId).toBe(1)
			expect(event.clientX).toBe(100)
			expect(event.clientY).toBe(200)
			expect(event.type).toBe('pointerdown')
		})

		it('should work with touch events', () => {
			const touchEvent = new TouchEvent('touchstart', {
				touches: [
					{
						clientX: 50,
						clientY: 60,
					} as Touch,
				],
			})

			expect(editor.wasEventAlreadyHandled(touchEvent)).toBe(false)
			editor.markEventAsHandled(touchEvent)
			expect(editor.wasEventAlreadyHandled(touchEvent)).toBe(true)
		})

		it('should work with keyboard events', () => {
			const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })

			expect(editor.wasEventAlreadyHandled(keyEvent)).toBe(false)
			editor.markEventAsHandled(keyEvent)
			expect(editor.wasEventAlreadyHandled(keyEvent)).toBe(true)
		})
	})
})

describe('loopToHtmlElement', () => {
	it('returns an element node as-is', () => {
		const div = document.createElement('div')
		expect(loopToHtmlElement(div)).toBe(div)
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		expect(loopToHtmlElement(svg)).toBe(svg)
	})

	it('walks up from a non-element node to its parent element', () => {
		const div = document.createElement('div')
		const text = document.createTextNode('hi')
		div.appendChild(text)
		expect(loopToHtmlElement(text as unknown as Element)).toBe(div)
	})

	it('throws for a detached non-element node', () => {
		const text = document.createTextNode('hi')
		expect(() => loopToHtmlElement(text as unknown as Element)).toThrow(
			'Could not find a parent element of an HTML type!'
		)
	})
})

describe('preventDefault', () => {
	afterEach(() => {
		debugFlags.logPreventDefaults.set(false)
		vi.restoreAllMocks()
	})

	it('prevents default on cancelable events', () => {
		const event = new MouseEvent('click', { cancelable: true })
		preventDefault(event)
		expect(event.defaultPrevented).toBe(true)
	})

	it('skips events that are not cancelable', () => {
		const event = new MouseEvent('click', { cancelable: false })
		const spy = vi.spyOn(event, 'preventDefault')
		preventDefault(event)
		expect(spy).not.toHaveBeenCalled()
	})

	it('works with synthetic events that have no cancelable flag', () => {
		const event = { preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent
		preventDefault(event)
		expect(event.preventDefault).toHaveBeenCalledTimes(1)
	})

	it('logs a warning only when the debug flag is on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		preventDefault(new MouseEvent('click', { cancelable: true }))
		expect(warn).not.toHaveBeenCalled()

		debugFlags.logPreventDefaults.set(true)
		const event = new MouseEvent('click', { cancelable: true })
		preventDefault(event)
		expect(warn).toHaveBeenCalledWith('preventDefault called on event:', event)
	})
})

describe('pointer capture', () => {
	let element: HTMLElement & {
		setPointerCapture: ReturnType<typeof vi.fn>
		releasePointerCapture: ReturnType<typeof vi.fn>
		hasPointerCapture: ReturnType<typeof vi.fn>
	}
	const event = new PointerEvent('pointerdown', { pointerId: 7 })

	beforeEach(() => {
		element = Object.assign(document.createElement('div'), {
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		})
	})

	afterEach(() => {
		debugFlags.logPointerCaptures.set(false)
		pointerCaptureTrackingObject.get().clear()
		vi.restoreAllMocks()
	})

	it('setPointerCapture captures the event pointer id', () => {
		setPointerCapture(element, event)
		expect(element.setPointerCapture).toHaveBeenCalledWith(7)
	})

	it('releasePointerCapture releases only when the element holds the capture', () => {
		releasePointerCapture(element, event)
		expect(element.releasePointerCapture).toHaveBeenCalledWith(7)

		element.hasPointerCapture.mockReturnValue(false)
		releasePointerCapture(element, event)
		expect(element.releasePointerCapture).toHaveBeenCalledTimes(1)
	})

	it('tracks capture counts per element when the debug flag is on', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		debugFlags.logPointerCaptures.set(true)
		const tracking = pointerCaptureTrackingObject.get()

		setPointerCapture(element, event)
		setPointerCapture(element, event)
		expect(tracking.get(element)).toBe(2)

		releasePointerCapture(element, event)
		expect(tracking.get(element)).toBe(1)

		releasePointerCapture(element, event)
		expect(tracking.has(element)).toBe(false)
	})

	it('warns about a release without a matching capture when the debug flag is on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		debugFlags.logPointerCaptures.set(true)

		releasePointerCapture(element, event)
		expect(warn).toHaveBeenCalledWith('Release without capture')
	})

	it('does not touch the tracking object when the debug flag is off', () => {
		setPointerCapture(element, event)
		releasePointerCapture(element, event)
		expect(pointerCaptureTrackingObject.get().size).toBe(0)
	})
})

describe('stopEventPropagation', () => {
	it('stops propagation of the event', () => {
		const event = new MouseEvent('click', { bubbles: true })
		const spy = vi.spyOn(event, 'stopPropagation')
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		stopEventPropagation(event)
		expect(spy).toHaveBeenCalledTimes(1)
	})
})

describe('setStyleProperty', () => {
	it('sets the property, coercing numbers to strings', () => {
		const div = document.createElement('div')
		setStyleProperty(div, '--foo', 12)
		setStyleProperty(div, 'width', '10px')
		expect(div.style.getPropertyValue('--foo')).toBe('12')
		expect(div.style.width).toBe('10px')
	})

	it('ignores a null element', () => {
		expect(() => setStyleProperty(null, 'width', 10)).not.toThrow()
	})
})

describe('moveElementInto', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('uses moveBefore when both nodes are connected to the same document', () => {
		const oldParent = document.createElement('div')
		const newParent = document.createElement('div')
		const child = document.createElement('span')
		oldParent.appendChild(child)
		document.body.append(oldParent, newParent)

		const moveBefore = vi.fn((node: Node) => newParent.appendChild(node))
		;(newParent as any).moveBefore = moveBefore

		moveElementInto(newParent, child)
		expect(moveBefore).toHaveBeenCalledWith(child, null)
		expect(child.parentElement).toBe(newParent)
	})

	it('falls back to appendChild when moveBefore is unavailable', () => {
		const newParent = document.createElement('div')
		const child = document.createElement('span')
		document.body.append(newParent, child)
		delete (newParent as any).moveBefore

		moveElementInto(newParent, child)
		expect(newParent.lastChild).toBe(child)
	})

	it('falls back to appendChild when moveBefore throws', () => {
		const newParent = document.createElement('div')
		const child = document.createElement('span')
		document.body.append(newParent, child)
		;(newParent as any).moveBefore = vi.fn(() => {
			throw new Error('nope')
		})

		moveElementInto(newParent, child)
		expect(newParent.lastChild).toBe(child)
	})

	it('falls back to appendChild for disconnected nodes', () => {
		const newParent = document.createElement('div')
		const child = document.createElement('span')
		const moveBefore = vi.fn()
		;(newParent as any).moveBefore = moveBefore

		moveElementInto(newParent, child)
		expect(moveBefore).not.toHaveBeenCalled()
		expect(newParent.lastChild).toBe(child)
	})
})

describe('elementShouldCaptureKeys', () => {
	it('is false for null and for ordinary elements', () => {
		expect(elementShouldCaptureKeys(null)).toBe(false)
		expect(elementShouldCaptureKeys(document.createElement('div'))).toBe(false)
		expect(elementShouldCaptureKeys(document.createElement('a'))).toBe(false)
	})

	it('is true for text inputs and textareas regardless of the buttons option', () => {
		expect(elementShouldCaptureKeys(document.createElement('input'))).toBe(true)
		expect(elementShouldCaptureKeys(document.createElement('textarea'))).toBe(true)
		expect(elementShouldCaptureKeys(document.createElement('input'), false)).toBe(true)
		expect(elementShouldCaptureKeys(document.createElement('textarea'), false)).toBe(true)
	})

	it('includes selects and buttons only when asked to', () => {
		expect(elementShouldCaptureKeys(document.createElement('select'))).toBe(true)
		expect(elementShouldCaptureKeys(document.createElement('button'))).toBe(true)
		expect(elementShouldCaptureKeys(document.createElement('select'), false)).toBe(false)
		expect(elementShouldCaptureKeys(document.createElement('button'), false)).toBe(false)
	})

	it('is true for content editable elements', () => {
		const div = document.createElement('div')
		Object.defineProperty(div, 'isContentEditable', { value: true })
		expect(elementShouldCaptureKeys(div, false)).toBe(true)
	})

	it('is true for slider thumbs', () => {
		const div = document.createElement('div')
		div.classList.add('tlui-slider__thumb')
		expect(elementShouldCaptureKeys(div, false)).toBe(true)
	})
})

describe('activeElementShouldCaptureKeys', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('reflects the focused element of the global document', () => {
		expect(activeElementShouldCaptureKeys()).toBe(false)

		const input = document.createElement('input')
		document.body.appendChild(input)
		input.focus()
		expect(activeElementShouldCaptureKeys()).toBe(true)

		input.blur()
		expect(activeElementShouldCaptureKeys()).toBe(false)
	})

	it('respects the buttons option', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		button.focus()
		expect(activeElementShouldCaptureKeys(true)).toBe(true)
		expect(activeElementShouldCaptureKeys(false)).toBe(false)
	})

	it('can check a specific document', () => {
		const textarea = document.createElement('textarea')
		document.body.appendChild(textarea)
		textarea.focus()
		expect(activeElementShouldCaptureKeys(true, document)).toBe(true)
		expect(
			activeElementShouldCaptureKeys(true, { activeElement: null } as unknown as Document)
		).toBe(false)
	})
})

describe('global accessors', () => {
	it('return the jsdom globals', () => {
		expect(getGlobalDocument()).toBe(document)
		expect(getGlobalWindow()).toBe(window)
	})
})
