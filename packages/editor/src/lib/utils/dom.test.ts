import { TestEditor } from '../test/TestEditor'
import { markEventAsHandled, wasEventAlreadyHandled } from './dom'

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
			expect(wasEventAlreadyHandled(editor, mockEvent)).toBe(false)

			// Mark the event as handled
			markEventAsHandled(editor, mockEvent)

			// Now it should be marked as handled
			expect(wasEventAlreadyHandled(editor, mockEvent)).toBe(true)
		})

		it('should work with React synthetic events', () => {
			const nativeEvent = new PointerEvent('pointerdown', { pointerId: 1 })
			const syntheticEvent = { nativeEvent }

			// Initially not handled
			expect(wasEventAlreadyHandled(editor, syntheticEvent)).toBe(false)
			expect(wasEventAlreadyHandled(editor, nativeEvent)).toBe(false)

			// Mark synthetic event as handled
			markEventAsHandled(editor, syntheticEvent)

			// Both synthetic and native should be marked as handled
			expect(wasEventAlreadyHandled(editor, syntheticEvent)).toBe(true)
			expect(wasEventAlreadyHandled(editor, nativeEvent)).toBe(true)
		})

		it('should handle multiple different events independently', () => {
			const event1 = new PointerEvent('pointerdown', { pointerId: 1 })
			const event2 = new PointerEvent('pointerup', { pointerId: 2 })
			const event3 = new MouseEvent('click')

			// Mark only event1 as handled
			markEventAsHandled(editor, event1)

			expect(wasEventAlreadyHandled(editor, event1)).toBe(true)
			expect(wasEventAlreadyHandled(editor, event2)).toBe(false)
			expect(wasEventAlreadyHandled(editor, event3)).toBe(false)

			// Mark event2 as handled
			markEventAsHandled(editor, event2)

			expect(wasEventAlreadyHandled(editor, event1)).toBe(true)
			expect(wasEventAlreadyHandled(editor, event2)).toBe(true)
			expect(wasEventAlreadyHandled(editor, event3)).toBe(false)
		})

		it('should not interfere with event properties', () => {
			const event = new PointerEvent('pointerdown', {
				pointerId: 1,
				clientX: 100,
				clientY: 200,
			})

			// Mark as handled
			markEventAsHandled(editor, event)

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

			expect(wasEventAlreadyHandled(editor, touchEvent)).toBe(false)
			markEventAsHandled(editor, touchEvent)
			expect(wasEventAlreadyHandled(editor, touchEvent)).toBe(true)
		})

		it('should work with keyboard events', () => {
			const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })

			expect(wasEventAlreadyHandled(editor, keyEvent)).toBe(false)
			markEventAsHandled(editor, keyEvent)
			expect(wasEventAlreadyHandled(editor, keyEvent)).toBe(true)
		})
	})
})
