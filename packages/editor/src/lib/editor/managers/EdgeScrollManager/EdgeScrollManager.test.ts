import { TLINSTANCE_ID } from '@tldraw/tlschema'
import { vi } from 'vitest'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { TestEditor } from '../../../test/TestEditor'
import { Editor } from '../../Editor'
import { TLPointerEventInfo } from '../../types/event-types'
import { EdgeScrollManager } from './EdgeScrollManager'

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

describe('EdgeScrollManager', () => {
	let editor: Editor
	let edgeScrollManager: EdgeScrollManager
	let setCameraSpy: any

	beforeEach(() => {
		editor = new TestEditor({
			options: {
				edgeScrollDelay: 200,
				edgeScrollEaseDuration: 200,
				edgeScrollSpeed: 25,
				edgeScrollDistance: 8,
				coarsePointerWidth: 12,
			},
		})
		setCameraSpy = vi.spyOn(editor, 'setCamera')
		edgeScrollManager = new EdgeScrollManager(editor)

		// Set up initial state: dragging and pointer in center
		const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
		editor.inputs.updateFromEvent(
			createPointerMoveEvent({
				x: screenBounds.x + 500,
				y: screenBounds.y + 300,
			})
		)
		editor.inputs.setIsDragging(true)
		editor.inputs.setIsPanning(false)
		editor.setCameraOptions({ isLocked: false })
	})

	afterEach(() => {
		if (editor) {
			editor.dispose()
		}
	})

	describe('edge scrolling behavior', () => {
		it('should not move camera when pointer is in center', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 500,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(16)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})

		it('should respect edge scroll delay', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			// First update - should not scroll yet due to delay
			edgeScrollManager.updateEdgeScrolling(100)
			expect(setCameraSpy).not.toHaveBeenCalled()

			// Second update - should trigger scrolling after delay
			edgeScrollManager.updateEdgeScrolling(150)
			expect(setCameraSpy).toHaveBeenCalled()
		})

		it('should scroll right when pointer is near left edge', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300) // Enough to trigger after delay

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll right when near left edge
		})

		it('should scroll left when pointer is near right edge', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 995,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeLessThan(0) // Should scroll left when near right edge
		})

		it('should scroll down when pointer is near top edge', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 500,
					y: screenBounds.y + 5,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeGreaterThan(0) // Should scroll down when near top edge
		})

		it('should scroll up when pointer is near bottom edge', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 500,
					y: screenBounds.y + 595,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.y).toBeLessThan(0) // Should scroll up when near bottom edge
		})

		it('should handle corner proximity (both x and y)', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 5,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll right
			expect(callArgs.y).toBeGreaterThan(0) // Should scroll down
		})

		it('should stop scrolling when pointer moves away from edge', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			// Start edge scrolling
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)
			edgeScrollManager.updateEdgeScrolling(300)
			expect(setCameraSpy).toHaveBeenCalled()

			// Move pointer to center
			setCameraSpy.mockClear()
			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 500,
					y: screenBounds.y + 300,
				})
			)
			edgeScrollManager.updateEdgeScrolling(16)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})
	})

	describe('coarse pointer handling', () => {
		it('should account for coarse pointer width', () => {
			editor.updateInstanceState({ isCoarsePointer: true })
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 15,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
		})

		it('should not trigger edge scrolling for fine pointer at same position', () => {
			editor.updateInstanceState({ isCoarsePointer: false })
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 15,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})
	})

	describe('camera movement conditions', () => {
		it('should not move camera when not dragging', () => {
			editor.inputs.setIsDragging(false)
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})

		it('should not move camera when panning', () => {
			editor.inputs.setIsPanning(true)
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})

		it('should not move camera when camera is locked', () => {
			editor.setCameraOptions({ isLocked: true })
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).not.toHaveBeenCalled()
		})
	})

	describe('camera movement calculation', () => {
		it('should calculate scroll speed based on user preference', () => {
			editor.user.updateUserPreferences({ edgeScrollSpeed: 2 })
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(0) // Should scroll when user speed is > 0
		})

		it('should apply screen size factor for small screens', () => {
			editor.updateViewportScreenBounds(new Box(0, 0, 800, 600))
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
		})

		it('should adjust scroll speed based on zoom level', () => {
			editor.setCamera(new Vec(0, 0, 2)) // Set zoom level to 2
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			// Higher zoom should result in smaller camera movement
			expect(Math.abs(callArgs.x)).toBeLessThan(25)
		})

		it('should add scroll delta to current camera position', () => {
			const currentCamera = new Vec(100, 200, 1)
			editor.setCamera(currentCamera)
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 5,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			expect(setCameraSpy).toHaveBeenCalled()
			const callArgs = setCameraSpy.mock.calls[0][0] as Vec
			expect(callArgs.x).toBeGreaterThan(100) // Should be added to current position
			expect(callArgs.y).toBeGreaterThan(200) // Should be added to current position
			expect(callArgs.z).toBe(1) // Z should remain unchanged
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle negative elapsed time', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			expect(() => edgeScrollManager.updateEdgeScrolling(-16)).not.toThrow()
		})

		it('should handle very large elapsed time', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			expect(() => edgeScrollManager.updateEdgeScrolling(100000)).not.toThrow()
		})

		it('should handle zero user edge scroll speed', () => {
			editor.user.updateUserPreferences({ edgeScrollSpeed: 0 })
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			edgeScrollManager.updateEdgeScrolling(300)

			if (setCameraSpy.mock.calls.length > 0) {
				const callArgs = setCameraSpy.mock.calls[0][0] as Vec
				expect(callArgs.x).toBe(0)
				expect(callArgs.y).toBe(0)
			}
		})

		it('should handle extreme zoom levels', () => {
			const screenBounds = editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds

			editor.inputs.updateFromEvent(
				createPointerMoveEvent({
					x: screenBounds.x + 5,
					y: screenBounds.y + 300,
				})
			)

			editor.setCamera(new Vec(0, 0, 0.01)) // Very zoomed out
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()

			editor.setCamera(new Vec(0, 0, 100)) // Very zoomed in
			expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()
		})
	})
})
