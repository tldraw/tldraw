import { Mock, Mocked, vi } from 'vitest'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { Editor } from '../../Editor'
import { EdgeScrollManager } from './EdgeScrollManager'

// Mock the Editor class
vi.mock('../../Editor')

describe('EdgeScrollManager', () => {
	let editor: Mocked<
		Editor & {
			user: { getEdgeScrollSpeed: Mock }
			getCamera: Mock
			getCameraOptions: Mock
			getZoomLevel: Mock
			getViewportScreenBounds: Mock
		}
	>
	let edgeScrollManager: EdgeScrollManager
	let mockInputs: {
		_currentScreenPoint: Vec
		currentScreenPoint: Vec
		getCurrentScreenPoint(): Vec
		setCurrentScreenPoint(value: Vec): void
		_isDragging: boolean
		isDragging: boolean
		getIsDragging(): boolean
		setIsDragging(value: boolean): void
		_isPanning: boolean
		isPanning: boolean
		getIsPanning(): boolean
		setIsPanning(value: boolean): void
	}

	beforeEach(() => {
		// Create a mock inputs object with writable properties and getters
		mockInputs = {
			_currentScreenPoint: new Vec(500, 300),
			get currentScreenPoint() {
				return this._currentScreenPoint
			},
			getCurrentScreenPoint() {
				return this._currentScreenPoint
			},
			setCurrentScreenPoint(value: Vec) {
				this._currentScreenPoint = value
			},
			_isDragging: true,
			get isDragging() {
				return this._isDragging
			},
			getIsDragging() {
				return this._isDragging
			},
			setIsDragging(value: boolean) {
				this._isDragging = value
			},
			_isPanning: false,
			get isPanning() {
				return this._isPanning
			},
			getIsPanning() {
				return this._isPanning
			},
			setIsPanning(value: boolean) {
				this._isPanning = value
			},
		}

		editor = {
			options: {
				edgeScrollDelay: 200,
				edgeScrollEaseDuration: 200,
				edgeScrollSpeed: 25,
				edgeScrollDistance: 8,
				coarsePointerWidth: 12,
			},
			inputs: mockInputs as unknown as Editor['inputs'],
			user: {
				getEdgeScrollSpeed: vi.fn(() => 1),
			},
			getViewportScreenBounds: vi.fn(() => new Box(0, 0, 1000, 600)),
			getInstanceState: vi.fn(() => ({
				isCoarsePointer: false,
				insets: [false, false, false, false], // [top, right, bottom, left]
			})),
			getCameraOptions: vi.fn(() => ({
				isLocked: false,
				panSpeed: 1,
				zoomSpeed: 1,
				zoomSteps: [1],
				wheelBehavior: 'pan' as const,
			})),
			getZoomLevel: vi.fn(() => 1),
			getCamera: vi.fn(() => new Vec(0, 0, 1)),
			setCamera: vi.fn(),
		} as unknown as Mocked<
			Editor & {
				user: { getEdgeScrollSpeed: Mock }
				getCamera: Mock
				getCameraOptions: Mock
				getZoomLevel: Mock
				getViewportScreenBounds: Mock
			}
		>

		edgeScrollManager = new EdgeScrollManager(editor)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('constructor and initialization', () => {
		it('should initialize with editor reference', () => {
			expect(edgeScrollManager.editor).toBe(editor)
		})
	})

	describe('basic edge scrolling behavior', () => {
		it('should not trigger edge scrolling when pointer is in center', () => {
			mockInputs.setCurrentScreenPoint(new Vec(500, 300))

			edgeScrollManager.updateEdgeScrolling(16)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should start edge scrolling when pointer is near edge', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			// Should not scroll immediately due to delay
			edgeScrollManager.updateEdgeScrolling(16)
			expect(editor.setCamera).not.toHaveBeenCalled()

			// Should scroll after delay
			edgeScrollManager.updateEdgeScrolling(200)
			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should stop edge scrolling when pointer moves away from edge', () => {
			// Start edge scrolling near edge
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))
			edgeScrollManager.updateEdgeScrolling(300)
			expect(editor.setCamera).toHaveBeenCalled()

			// Move pointer to center - should stop scrolling
			editor.setCamera.mockClear()
			mockInputs.setCurrentScreenPoint(new Vec(500, 300))
			edgeScrollManager.updateEdgeScrolling(16)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should respect edge scroll delay', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			// First update - should not scroll yet due to delay
			edgeScrollManager.updateEdgeScrolling(100)
			expect(editor.setCamera).not.toHaveBeenCalled()

			// Second update - should trigger scrolling after delay
			edgeScrollManager.updateEdgeScrolling(150)
			expect(editor.setCamera).toHaveBeenCalled()
		})
	})

	describe('edge proximity detection', () => {
		it('should detect left edge proximity', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))
			edgeScrollManager.updateEdgeScrolling(300) // Enough to trigger after delay

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll right when near left edge
		})

		it('should detect right edge proximity', () => {
			mockInputs.setCurrentScreenPoint(new Vec(995, 300))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeLessThan(0) // Should scroll left when near right edge
		})

		it('should detect top edge proximity', () => {
			mockInputs.setCurrentScreenPoint(new Vec(500, 5))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeGreaterThan(0) // Should scroll down when near top edge
		})

		it('should detect bottom edge proximity', () => {
			mockInputs.setCurrentScreenPoint(new Vec(500, 595))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeLessThan(0) // Should scroll up when near bottom edge
		})

		it('should handle corner proximity (both x and y)', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 5))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll right
			expect(callArgs.y).toBeGreaterThan(0) // Should scroll down
		})
	})

	describe('coarse pointer handling', () => {
		it('should account for coarse pointer width', () => {
			editor.getInstanceState.mockReturnValue({
				...editor.getInstanceState(),
				isCoarsePointer: true,
				insets: [false, false, false, false],
			})
			mockInputs.setCurrentScreenPoint(new Vec(15, 300))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should not trigger edge scrolling for fine pointer at same position', () => {
			editor.getInstanceState.mockReturnValue({
				...editor.getInstanceState(),
				isCoarsePointer: false,
				insets: [false, false, false, false],
			})
			mockInputs.setCurrentScreenPoint(new Vec(15, 300))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})
	})

	describe('camera movement conditions', () => {
		it('should not move camera when not dragging', () => {
			editor.inputs.setIsDragging(false)
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should not move camera when panning', () => {
			editor.inputs.setIsPanning(true)
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should not move camera when camera is locked', () => {
			editor.getCameraOptions.mockReturnValue({
				isLocked: true,
				panSpeed: 1,
				zoomSpeed: 1,
				zoomSteps: [1],
				wheelBehavior: 'pan' as const,
			})
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})
	})

	describe('camera movement calculation', () => {
		it('should calculate scroll speed based on user preference', () => {
			editor.user.getEdgeScrollSpeed.mockReturnValue(2)
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll when user speed is > 0
		})

		it('should apply screen size factor for small screens', () => {
			editor.getViewportScreenBounds.mockReturnValue(new Box(0, 0, 800, 600))
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should adjust scroll speed based on zoom level', () => {
			editor.getZoomLevel.mockReturnValue(2)
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			// Higher zoom should result in smaller camera movement
			expect(Math.abs(callArgs.x)).toBeLessThan(25)
		})

		it('should add scroll delta to current camera position', () => {
			const currentCamera = new Vec(100, 200, 1)
			editor.getCamera.mockReturnValue(currentCamera)
			mockInputs.setCurrentScreenPoint(new Vec(5, 5))

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(100) // Should be added to current position
			expect(callArgs.y).toBeGreaterThan(200) // Should be added to current position
			expect(callArgs.z).toBe(1) // Z should remain unchanged
		})
	})

	describe('proximity factor calculation', () => {
		it('should return 0 when not near any edge', () => {
			mockInputs.setCurrentScreenPoint(new Vec(500, 300))
			edgeScrollManager.updateEdgeScrolling(16)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should cap proximity factor at 1', () => {
			mockInputs.setCurrentScreenPoint(new Vec(0, 300))
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			// The proximity factor should be capped, so movement shouldn't be infinite
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle negative elapsed time', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			expect(() => edgeScrollManager.updateEdgeScrolling(-16)).not.toThrow()
		})

		it('should handle very large elapsed time', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			expect(() => edgeScrollManager.updateEdgeScrolling(100000)).not.toThrow()
		})

		it('should handle zero user edge scroll speed', () => {
			editor.user.getEdgeScrollSpeed.mockReturnValue(0)
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			edgeScrollManager.updateEdgeScrolling(300)

			if (editor.setCamera.mock.calls.length > 0) {
				const callArgs = editor.setCamera.mock.calls[0][0] as Vec
				expect(callArgs.x).toBe(0)
				expect(callArgs.y).toBe(0)
			}
		})

		it('should handle extreme zoom levels', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			editor.getZoomLevel.mockReturnValue(0.01) // Very zoomed out
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()

			editor.getZoomLevel.mockReturnValue(100) // Very zoomed in
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()
		})
	})

	describe('state transitions', () => {
		it('should properly transition from not scrolling to scrolling', () => {
			// Start with no edge scrolling
			mockInputs.setCurrentScreenPoint(new Vec(500, 300))
			edgeScrollManager.updateEdgeScrolling(16)
			expect(editor.setCamera).not.toHaveBeenCalled()

			// Move to edge - should start scrolling after delay
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))
			edgeScrollManager.updateEdgeScrolling(16)
			expect(editor.setCamera).not.toHaveBeenCalled() // Not yet, due to delay

			edgeScrollManager.updateEdgeScrolling(200)
			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should accumulate edge scroll duration over multiple updates', () => {
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))

			// First update - not enough time
			edgeScrollManager.updateEdgeScrolling(50)
			expect(editor.setCamera).not.toHaveBeenCalled()

			// Second update - still not enough
			edgeScrollManager.updateEdgeScrolling(50)
			expect(editor.setCamera).not.toHaveBeenCalled()

			// Third update - now should trigger (50 + 50 + 101 = 201ms > 200ms delay)
			edgeScrollManager.updateEdgeScrolling(101)
			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should reset duration when stopping edge scroll', () => {
			// Start edge scrolling
			mockInputs.setCurrentScreenPoint(new Vec(5, 300))
			edgeScrollManager.updateEdgeScrolling(300)
			expect(editor.setCamera).toHaveBeenCalled()

			// Stop edge scrolling - move away
			editor.setCamera.mockClear()
			mockInputs.setCurrentScreenPoint(new Vec(500, 300))
			edgeScrollManager.updateEdgeScrolling(16)
			expect(editor.setCamera).not.toHaveBeenCalled()
		})
	})
})
