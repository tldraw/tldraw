import { Mock, Mocked, vi } from 'vitest'
import { Vec } from '../../../primitives/Vec'
import { Editor } from '../../Editor'
import { TickManager } from './TickManager'

// Mock the Editor class
vi.mock('../../Editor')

// Mock Date.now to control time
const mockDateNow = vi.fn()
Date.now = mockDateNow

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn()
const mockCancelAnimationFrame = vi.fn()
global.requestAnimationFrame = mockRequestAnimationFrame
global.cancelAnimationFrame = mockCancelAnimationFrame

describe('TickManager', () => {
	let editor: Mocked<Editor>
	let tickManager: TickManager
	let mockEmit: Mock
	let mockDisposablesAdd: Mock

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

		mockEmit = vi.fn()
		mockDisposablesAdd = vi.fn()

		editor = {
			emit: mockEmit,
			disposables: {
				add: mockDisposablesAdd,
			},
			inputs: {
				currentScreenPoint: new Vec(100, 100),
				pointerVelocity: new Vec(0, 0),
			},
		} as any

		tickManager = new TickManager(editor)
	})

	afterEach(() => {
		if (tickManager) {
			tickManager.dispose()
		}
	})

	describe('constructor and initialization', () => {
		it('should initialize with correct default values', () => {
			expect(tickManager.editor).toBe(editor)
			expect(tickManager.isPaused).toBe(false)
			expect(tickManager.now).toBe(1000)
		})

		it('should add dispose method to editor disposables', () => {
			expect(mockDisposablesAdd).toHaveBeenCalledWith(tickManager.dispose)
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

		it('should update pointer velocity', () => {
			const updatePointerVelocitySpy = vi.spyOn(tickManager as any, 'updatePointerVelocity')
			tickManager.now = 1000
			mockDateNow.mockReturnValue(1016)

			tickManager.tick()

			expect(updatePointerVelocitySpy).toHaveBeenCalledWith(16)
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

	describe('updatePointerVelocity method', () => {
		let updatePointerVelocity: any

		beforeEach(() => {
			// Access private method for testing
			updatePointerVelocity = (tickManager as any).updatePointerVelocity.bind(tickManager)
			// Reset the prevPoint to a known state
			;(tickManager as any).prevPoint = new Vec(50, 50)
		})

		it('should return early if elapsed time is 0', () => {
			const originalVelocity = editor.inputs.pointerVelocity.clone()

			updatePointerVelocity(0)

			expect(editor.inputs.pointerVelocity).toEqual(originalVelocity)
		})

		it('should calculate velocity based on pointer movement', () => {
			editor.inputs.currentScreenPoint = new Vec(150, 150)
			;(tickManager as any).prevPoint = new Vec(50, 50)
			editor.inputs.pointerVelocity = new Vec(0, 0)

			updatePointerVelocity(100) // 100ms elapsed

			// Delta should be (100, 100), length = ~141.42, direction = (~0.707, ~0.707)
			// Velocity should be length/elapsed = ~1.414 per ms in each direction
			// But with linear interpolation (lrp factor 0.5), it will be halved
			const expectedVelocity = new Vec(0.5, 0.5) // With lrp factor 0.5
			expect(editor.inputs.pointerVelocity.x).toBeCloseTo(expectedVelocity.x, 1)
			expect(editor.inputs.pointerVelocity.y).toBeCloseTo(expectedVelocity.y, 1)
		})

		it('should update prevPoint to current screen point', () => {
			const newPoint = new Vec(200, 200)
			editor.inputs.currentScreenPoint = newPoint

			updatePointerVelocity(16)

			expect((tickManager as any).prevPoint).toEqual(newPoint)
		})

		it('should use linear interpolation to smooth velocity', () => {
			editor.inputs.currentScreenPoint = new Vec(150, 50)
			;(tickManager as any).prevPoint = new Vec(50, 50)
			editor.inputs.pointerVelocity = new Vec(2, 2)

			updatePointerVelocity(100)

			// Should interpolate between current velocity (2,2) and new velocity (1,0)
			// lrp with factor 0.5 should give us something between them
			expect(editor.inputs.pointerVelocity.x).toBeGreaterThan(0.5)
			expect(editor.inputs.pointerVelocity.x).toBeLessThan(2)
		})

		it('should set very small velocity components to 0', () => {
			editor.inputs.currentScreenPoint = new Vec(50.005, 50.005)
			;(tickManager as any).prevPoint = new Vec(50, 50)
			editor.inputs.pointerVelocity = new Vec(0, 0)

			updatePointerVelocity(1000) // Long elapsed time = very small velocity

			expect(editor.inputs.pointerVelocity.x).toBe(0)
			expect(editor.inputs.pointerVelocity.y).toBe(0)
		})

		it('should handle zero movement (stationary pointer)', () => {
			editor.inputs.currentScreenPoint = new Vec(100, 100)
			;(tickManager as any).prevPoint = new Vec(100, 100)
			editor.inputs.pointerVelocity = new Vec(1, 1)

			updatePointerVelocity(16)

			// Should interpolate towards zero velocity
			expect(editor.inputs.pointerVelocity.x).toBeLessThan(1)
			expect(editor.inputs.pointerVelocity.y).toBeLessThan(1)
		})

		it('should only update pointerVelocity if it actually changes', () => {
			// Setup scenario where velocity won't change
			editor.inputs.currentScreenPoint = new Vec(100, 100)
			;(tickManager as any).prevPoint = new Vec(100, 100)
			editor.inputs.pointerVelocity = new Vec(0, 0)

			const originalVelocity = editor.inputs.pointerVelocity
			updatePointerVelocity(16)

			// Should still be the same object reference since no change occurred
			expect(editor.inputs.pointerVelocity).toBe(originalVelocity)
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
