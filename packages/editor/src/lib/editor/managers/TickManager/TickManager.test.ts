import { TLINSTANCE_ID } from '@tldraw/tlschema'
import { vi } from 'vitest'
import { Vec } from '../../../primitives/Vec'
import { TestEditor } from '../../../test/TestEditor'
import { Editor } from '../../Editor'
import { TLPointerEventInfo } from '../../types/event-types'
import { TickManager } from './TickManager'

// Mock Date.now to control time
const mockDateNow = vi.fn()
Date.now = mockDateNow

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn()
const mockCancelAnimationFrame = vi.fn()
global.requestAnimationFrame = mockRequestAnimationFrame
global.cancelAnimationFrame = mockCancelAnimationFrame

const createPointerMoveEvent = (point: { x: number; y: number }): TLPointerEventInfo => ({
	type: 'pointer',
	name: 'pointer_move',
	point,
	pointerId: 1,
	button: 0,
	isPen: false,
	target: 'canvas',
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	accelKey: false,
})

describe('TickManager', () => {
	let editor: Editor
	let tickManager: TickManager
	// @ts-expect-error - Editor.emit is inherited
	let mockEmit: ReturnType<typeof vi.spyOn<Editor, 'emit'>>

	beforeEach(() => {
		vi.clearAllMocks()

		// Reset time
		mockDateNow.mockReturnValue(1000)

		// Mock RAF to execute callback immediately in tests
		mockRequestAnimationFrame.mockImplementation((callback) => {
			const id = Math.random()
			// Execute immediately for tests
			setTimeout(callback, 0)
			return id
		})

		mockCancelAnimationFrame.mockImplementation(() => {})

		// Create a real editor instance
		editor = new TestEditor()
		mockEmit = vi.spyOn(editor, 'emit')

		// Initialize pointer position
		const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
		editor.inputs.updateFromEvent(
			createPointerMoveEvent({
				x: screenBounds.x + 100,
				y: screenBounds.y + 100,
			})
		)

		tickManager = new TickManager(editor)
	})

	afterEach(() => {
		if (tickManager) {
			tickManager.dispose()
		}
		if (editor) {
			editor.dispose()
		}
	})

	describe('constructor and initialization', () => {
		it('should initialize with correct default values', () => {
			expect(tickManager.editor).toBe(editor)
			expect(tickManager.isPaused).toBe(false)
			expect(tickManager.now).toBe(1000)
		})

		it('should add dispose method to editor disposables', () => {
			// The dispose method should be added to editor.disposables
			// Check that disposables set contains the dispose function
			expect(editor.disposables.size).toBeGreaterThan(0)
			expect(Array.from(editor.disposables)).toContain(tickManager.dispose)
		})

		it('should start the tick loop on construction', () => {
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})
	})

	describe('start method', () => {
		it('should set isPaused to false', () => {
			tickManager.isPaused = true
			tickManager.start()
			expect(tickManager.isPaused).toBe(false)
		})

		it('should update the now timestamp', () => {
			mockDateNow.mockReturnValue(2000)
			tickManager.start()
			expect(tickManager.now).toBe(2000)
		})

		it('should cancel existing RAF before starting new one', () => {
			const mockCancel = vi.fn()
			tickManager.cancelRaf = mockCancel

			tickManager.start()

			expect(mockCancel).toHaveBeenCalled()
		})

		it('should schedule new RAF', () => {
			mockRequestAnimationFrame.mockClear()
			tickManager.start()
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})
	})

	describe('tick method', () => {
		beforeEach(() => {
			// Reset mocks
			mockEmit.mockClear()
			mockRequestAnimationFrame.mockClear()
		})

		it('should return early if paused', () => {
			tickManager.isPaused = true
			tickManager.tick()

			expect(mockEmit).not.toHaveBeenCalled()
			expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
		})

		it('should calculate elapsed time correctly', () => {
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1050)

			tickManager.tick()

			expect(tickManager.now).toBe(1050)
			expect(mockEmit).toHaveBeenCalledWith('frame', 50)
			expect(mockEmit).toHaveBeenCalledWith('tick', 50)
		})

		it('should emit frame and tick events with elapsed time', () => {
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1100)

			tickManager.tick()

			expect(mockEmit).toHaveBeenCalledWith('frame', 100)
			expect(mockEmit).toHaveBeenCalledWith('tick', 100)
			expect(mockEmit).toHaveBeenCalledTimes(2)
		})

		it('should update pointer velocity during tick', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			const initialVelocity = editor.inputs.getPointerVelocity()

			// Move pointer
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 150,
					y: screenBounds.y + 150,
				})
			)

			tickManager.now = 1000
			mockDateNow.mockReturnValue(1016)
			tickManager.tick()

			// Velocity should have been updated if pointer moved
			const newVelocity = editor.inputs.getPointerVelocity()
			expect(newVelocity).not.toEqual(initialVelocity)
		})

		it('should schedule next RAF', () => {
			tickManager.tick()
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})

		it('should handle zero elapsed time', () => {
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1000)

			tickManager.tick()

			expect(mockEmit).toHaveBeenCalledWith('frame', 0)
			expect(mockEmit).toHaveBeenCalledWith('tick', 0)
		})
	})

	describe('dispose method', () => {
		it('should set isPaused to true', () => {
			tickManager.isPaused = false
			tickManager.dispose()
			expect(tickManager.isPaused).toBe(true)
		})

		it('should cancel RAF if exists', () => {
			const mockCancel = vi.fn()
			tickManager.cancelRaf = mockCancel

			tickManager.dispose()

			expect(mockCancel).toHaveBeenCalled()
		})

		it('should handle dispose when cancelRaf is null', () => {
			tickManager.cancelRaf = null

			expect(() => tickManager.dispose()).not.toThrow()
		})
	})

	describe('pointer velocity updates', () => {
		beforeEach(() => {
			mockEmit.mockClear()
			mockRequestAnimationFrame.mockClear()
		})

		it('should calculate velocity based on pointer movement', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			// Set initial pointer position
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 50,
					y: screenBounds.y + 50,
				})
			)
			editor.inputs.setPointerVelocity(new Vec(0, 0))

			// Move pointer to new position
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 150,
					y: screenBounds.y + 150,
				})
			)

			// Simulate tick with elapsed time
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1100)
			tickManager.tick()

			// Delta should be (100, 100), length = ~141.42
			// Velocity should be length/elapsed = ~1.414 per ms
			// But with linear interpolation (lrp factor 0.5), it will be halved
			const velocity = editor.inputs.getPointerVelocity()
			const expectedVelocity = new Vec(0.5, 0.5) // With lrp factor 0.5
			expect(velocity.x).toBeCloseTo(expectedVelocity.x, 1)
			expect(velocity.y).toBeCloseTo(expectedVelocity.y, 1)
		})

		it('should track pointer position across multiple ticks', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			// Set initial pointer position
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 100,
					y: screenBounds.y + 100,
				})
			)

			// Move pointer
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 200,
					y: screenBounds.y + 200,
				})
			)

			tickManager.now = 1000
			mockDateNow.mockReturnValue(1016)
			tickManager.tick()

			// Move pointer again
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 300,
					y: screenBounds.y + 300,
				})
			)

			tickManager.now = 1016
			mockDateNow.mockReturnValue(1032)
			tickManager.tick()

			// Velocity should be calculated based on the movement from 200,200 to 300,300
			const velocity = editor.inputs.getPointerVelocity()
			expect(velocity.x).toBeGreaterThan(0)
			expect(velocity.y).toBeGreaterThan(0)
		})

		it('should use linear interpolation to smooth velocity', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			// Set initial pointer position
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 50,
					y: screenBounds.y + 50,
				})
			)
			editor.inputs.setPointerVelocity(new Vec(2, 2))

			// Move pointer
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 150,
					y: screenBounds.y + 50,
				})
			)

			tickManager.now = 1000
			mockDateNow.mockReturnValue(1100)
			tickManager.tick()

			// Should interpolate between current velocity (2,2) and new velocity (1,0)
			// lrp with factor 0.5 should give us something between them
			const velocity = editor.inputs.getPointerVelocity()
			expect(velocity.x).toBeGreaterThan(0.5)
			expect(velocity.x).toBeLessThan(2)
		})

		it('should set very small velocity components to 0', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			// Set initial pointer position
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 50,
					y: screenBounds.y + 50,
				})
			)
			editor.inputs.setPointerVelocity(new Vec(0, 0))

			// Move pointer very slightly
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 50.005,
					y: screenBounds.y + 50.005,
				})
			)

			// Long elapsed time = very small velocity
			tickManager.now = 1000
			mockDateNow.mockReturnValue(2000)
			tickManager.tick()

			const velocity = editor.inputs.getPointerVelocity()
			expect(velocity.x).toBe(0)
			expect(velocity.y).toBe(0)
		})

		it('should handle zero movement (stationary pointer)', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			const point = { x: screenBounds.x + 100, y: screenBounds.y + 100 }

			// Set pointer position
			editor.inputs.updateFromEvent(createPointerMoveEvent(point))
			editor.inputs.setPointerVelocity(new Vec(1, 1))

			// Pointer doesn't move - stay at same position
			editor.inputs.updateFromEvent(createPointerMoveEvent(point))

			tickManager.now = 1000
			mockDateNow.mockReturnValue(1016)
			tickManager.tick()

			// Should interpolate towards zero velocity
			const velocity = editor.inputs.getPointerVelocity()
			expect(velocity.x).toBeLessThan(1)
			expect(velocity.y).toBeLessThan(1)
		})

		it('should handle zero elapsed time', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			const originalVelocity = editor.inputs.getPointerVelocity()

			// Move pointer
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 150,
					y: screenBounds.y + 150,
				})
			)

			// Zero elapsed time
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1000)
			tickManager.tick()

			// Velocity should not change when elapsed time is 0
			expect(editor.inputs.getPointerVelocity()).toEqual(originalVelocity)
		})
	})

	describe('RAF throttling behavior', () => {
		it('should use test-specific RAF behavior in test environment', () => {
			// The TickManager should detect test environment and use requestAnimationFrame directly
			// This is already handled by the mock, but we can verify the behavior
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})
	})

	describe('integration with tick loop', () => {
		it('should schedule RAF on start', () => {
			mockRequestAnimationFrame.mockClear()
			tickManager.start()
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})

		it('should schedule RAF after each tick', () => {
			mockRequestAnimationFrame.mockClear()
			tickManager.tick()
			expect(mockRequestAnimationFrame).toHaveBeenCalled()
		})

		it('should not schedule RAF when paused', () => {
			tickManager.isPaused = true
			mockRequestAnimationFrame.mockClear()
			tickManager.tick()
			expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
		})
	})
})
