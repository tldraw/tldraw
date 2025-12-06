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

	beforeEach(() => {
		editor = {
			options: {
				edgeScrollDelay: 200,
				edgeScrollEaseDuration: 200,
				edgeScrollSpeed: 25,
				edgeScrollDistance: 8,
				coarsePointerWidth: 12,
			},
			inputs: {
				currentScreenPoint: new Vec(500, 300),
				isDragging: true,
				isPanning: false,
			},
			user: {
				getEdgeScrollSpeed: vi.fn(() => 1),
			},
			getViewportScreenBounds: vi.fn(() => new Box(0, 0, 1000, 600)),
			getInstanceState: vi.fn(
				() =>
					({
						isCoarsePointer: false,
						insets: [false, false, false, false], // [top, right, bottom, left]
					}) as any
			),
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
		} as any

		edgeScrollManager = new EdgeScrollManager(editor as any)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('constructor and initialization', () => {
		it('should initialize with editor reference', () => {
			expect(edgeScrollManager.editor).toBe(editor)
		})

		it('should initialize edge scrolling state as false', () => {
			// Access private properties for testing
			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(false)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(-1)
		})
	})

	describe('basic edge scrolling behavior', () => {
		it('should not trigger edge scrolling when pointer is in center', () => {
			editor.inputs.currentScreenPoint = new Vec(500, 300)

			edgeScrollManager.updateEdgeScrolling(16)

			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(false)
			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should start edge scrolling when pointer is near edge', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(16)

			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(true)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(16)
		})

		it('should stop edge scrolling when pointer moves away from edge', () => {
			// Start edge scrolling
			editor.inputs.currentScreenPoint = new Vec(5, 300)
			edgeScrollManager.updateEdgeScrolling(16)
			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(true)

			// Move pointer to center
			editor.inputs.currentScreenPoint = new Vec(500, 300)
			edgeScrollManager.updateEdgeScrolling(16)

			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(false)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(0)
		})

		it('should respect edge scroll delay', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

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
			editor.inputs.currentScreenPoint = new Vec(5, 300)
			edgeScrollManager.updateEdgeScrolling(300) // Enough to trigger after delay

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll right when near left edge
		})

		it('should detect right edge proximity', () => {
			editor.inputs.currentScreenPoint = new Vec(995, 300)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeLessThan(0) // Should scroll left when near right edge
		})

		it('should detect top edge proximity', () => {
			editor.inputs.currentScreenPoint = new Vec(500, 5)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeGreaterThan(0) // Should scroll down when near top edge
		})

		it('should detect bottom edge proximity', () => {
			editor.inputs.currentScreenPoint = new Vec(500, 595)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeLessThan(0) // Should scroll up when near bottom edge
		})

		it('should handle corner proximity (both x and y)', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 5)
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
				isCoarsePointer: true,
				insets: [false, false, false, false],
			} as any)

			editor.inputs.currentScreenPoint = new Vec(15, 300)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should not trigger edge scrolling for fine pointer at same position', () => {
			editor.getInstanceState.mockReturnValue({
				isCoarsePointer: false,
				insets: [false, false, false, false],
			} as any)

			editor.inputs.currentScreenPoint = new Vec(15, 300)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})
	})

	describe('camera movement conditions', () => {
		it('should not move camera when not dragging', () => {
			editor.inputs.isDragging = false
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should not move camera when panning', () => {
			editor.inputs.isPanning = true
			editor.inputs.currentScreenPoint = new Vec(5, 300)

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
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})
	})

	describe('camera movement calculation', () => {
		it('should calculate scroll speed based on user preference', () => {
			editor.user.getEdgeScrollSpeed.mockReturnValue(2)
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll when user speed is > 0
		})

		it('should apply screen size factor for small screens', () => {
			editor.getViewportScreenBounds.mockReturnValue(new Box(0, 0, 800, 600))
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
		})

		it('should adjust scroll speed based on zoom level', () => {
			editor.getZoomLevel.mockReturnValue(2)
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			const callArgs = editor.setCamera.mock.calls[0][0] as Vec
			// Higher zoom should result in smaller camera movement
			expect(Math.abs(callArgs.x)).toBeLessThan(25)
		})

		it('should add scroll delta to current camera position', () => {
			const currentCamera = new Vec(100, 200, 1)
			editor.getCamera.mockReturnValue(currentCamera)
			editor.inputs.currentScreenPoint = new Vec(5, 5)

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
			editor.inputs.currentScreenPoint = new Vec(500, 300)
			edgeScrollManager.updateEdgeScrolling(16)

			expect(editor.setCamera).not.toHaveBeenCalled()
		})

		it('should cap proximity factor at 1', () => {
			editor.inputs.currentScreenPoint = new Vec(0, 300)
			edgeScrollManager.updateEdgeScrolling(300)

			expect(editor.setCamera).toHaveBeenCalled()
			// The proximity factor should be capped, so movement shouldn't be infinite
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle negative elapsed time', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			expect(() => edgeScrollManager.updateEdgeScrolling(-16)).not.toThrow()
		})

		it('should handle very large elapsed time', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			expect(() => edgeScrollManager.updateEdgeScrolling(100000)).not.toThrow()
		})

		it('should handle zero user edge scroll speed', () => {
			editor.user.getEdgeScrollSpeed.mockReturnValue(0)
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(300)

			if (editor.setCamera.mock.calls.length > 0) {
				const callArgs = editor.setCamera.mock.calls[0][0] as Vec
				expect(callArgs.x).toBe(0)
				expect(callArgs.y).toBe(0)
			}
		})

		it('should handle extreme zoom levels', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			editor.getZoomLevel.mockReturnValue(0.01) // Very zoomed out
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()

			editor.getZoomLevel.mockReturnValue(100) // Very zoomed in
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()
		})
	})

	describe('state transitions', () => {
		it('should properly transition from not scrolling to scrolling', () => {
			// Start with no edge scrolling
			editor.inputs.currentScreenPoint = new Vec(500, 300)
			edgeScrollManager.updateEdgeScrolling(16)
			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(false)

			// Move to edge
			editor.inputs.currentScreenPoint = new Vec(5, 300)
			edgeScrollManager.updateEdgeScrolling(16)
			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(true)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(16)
		})

		it('should accumulate edge scroll duration over multiple updates', () => {
			editor.inputs.currentScreenPoint = new Vec(5, 300)

			edgeScrollManager.updateEdgeScrolling(50)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(50)

			edgeScrollManager.updateEdgeScrolling(30)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(80)

			edgeScrollManager.updateEdgeScrolling(25)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(105)
		})

		it('should reset duration when stopping edge scroll', () => {
			// Start edge scrolling
			editor.inputs.currentScreenPoint = new Vec(5, 300)
			edgeScrollManager.updateEdgeScrolling(100)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(100)

			// Stop edge scrolling
			editor.inputs.currentScreenPoint = new Vec(500, 300)
			edgeScrollManager.updateEdgeScrolling(16)
			expect((edgeScrollManager as any)._isEdgeScrolling).toBe(false)
			expect((edgeScrollManager as any)._edgeScrollDuration).toBe(0)
		})
	})
})
