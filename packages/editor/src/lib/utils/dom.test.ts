import { markEventAsHandled, wasEventAlreadyHandled } from './dom'

// Mock PointerEvent for Node.js test environment
global.PointerEvent = class MockPointerEvent extends Event {
	pointerId: number
	clientX: number
	clientY: number

	constructor(type: string, options: any = {}) {
		super(type, options)
		this.pointerId = options.pointerId || 0
		this.clientX = options.clientX || 0
		this.clientY = options.clientY || 0
	}
} as any

describe('Event handling utilities', () => {
	describe('markEventAsHandled and wasEventAlreadyHandled', () => {
		it('should track events as handled', () => {
			const mockEvent = new PointerEvent('pointerdown', { pointerId: 1 })

			// Initially, event should not be marked as handled
			expect(wasEventAlreadyHandled(mockEvent)).toBe(false)

			// Mark the event as handled
			markEventAsHandled(mockEvent)

			// Now it should be marked as handled
			expect(wasEventAlreadyHandled(mockEvent)).toBe(true)
		})

		it('should work with React synthetic events', () => {
			const nativeEvent = new PointerEvent('pointerdown', { pointerId: 1 })
			const syntheticEvent = { nativeEvent }

			// Initially not handled
			expect(wasEventAlreadyHandled(syntheticEvent)).toBe(false)
			expect(wasEventAlreadyHandled(nativeEvent)).toBe(false)

			// Mark synthetic event as handled
			markEventAsHandled(syntheticEvent)

			// Both synthetic and native should be marked as handled
			expect(wasEventAlreadyHandled(syntheticEvent)).toBe(true)
			expect(wasEventAlreadyHandled(nativeEvent)).toBe(true)
		})

		it('should handle multiple different events independently', () => {
			const event1 = new PointerEvent('pointerdown', { pointerId: 1 })
			const event2 = new PointerEvent('pointerup', { pointerId: 2 })
			const event3 = new MouseEvent('click')

			// Mark only event1 as handled
			markEventAsHandled(event1)

			expect(wasEventAlreadyHandled(event1)).toBe(true)
			expect(wasEventAlreadyHandled(event2)).toBe(false)
			expect(wasEventAlreadyHandled(event3)).toBe(false)

			// Mark event2 as handled
			markEventAsHandled(event2)

			expect(wasEventAlreadyHandled(event1)).toBe(true)
			expect(wasEventAlreadyHandled(event2)).toBe(true)
			expect(wasEventAlreadyHandled(event3)).toBe(false)
		})

		it('should not interfere with event properties', () => {
			const event = new PointerEvent('pointerdown', {
				pointerId: 1,
				clientX: 100,
				clientY: 200,
			})

			// Mark as handled
			markEventAsHandled(event)

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

			expect(wasEventAlreadyHandled(touchEvent)).toBe(false)
			markEventAsHandled(touchEvent)
			expect(wasEventAlreadyHandled(touchEvent)).toBe(true)
		})

		it('should work with keyboard events', () => {
			const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })

			expect(wasEventAlreadyHandled(keyEvent)).toBe(false)
			markEventAsHandled(keyEvent)
			expect(wasEventAlreadyHandled(keyEvent)).toBe(true)
		})
	})
})
