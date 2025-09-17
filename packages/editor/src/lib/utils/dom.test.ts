import { TestEditor } from '../test/TestEditor'

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
