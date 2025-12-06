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
	let mockInputs: {
		_currentScreenPoint: Vec
		getCurrentScreenPoint(): Vec
		currentScreenPoint: Vec
		setCurrentScreenPoint(value: Vec): void
		_pointerVelocity: Vec
		getPointerVelocity(): Vec
		pointerVelocity: Vec
		setPointerVelocity(value: Vec): void
		updatePointerVelocity(elapsed: number): void
	}

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

		// Create a mock inputs object with getters and setters
		mockInputs = {
			_currentScreenPoint: new Vec(100, 100),
			getCurrentScreenPoint() {
				return this._currentScreenPoint
			},
			get currentScreenPoint() {
				return this.getCurrentScreenPoint()
			},
			setCurrentScreenPoint(value: Vec) {
				this._currentScreenPoint = value
			},
			_pointerVelocity: new Vec(0, 0),
			getPointerVelocity() {
				return this._pointerVelocity
			},
			get pointerVelocity() {
				return this.getPointerVelocity()
			},
			setPointerVelocity(value: Vec) {
				this._pointerVelocity = value
			},
			updatePointerVelocity(_elapsed: number) {
				// Mock implementation - no-op for tests
			},
		}

		editor = {
			emit: mockEmit,
			disposables: {
				add: mockDisposablesAdd,
			},
			inputs: mockInputs as unknown as Editor['inputs'],
		} as unknown as Mocked<Editor>

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
