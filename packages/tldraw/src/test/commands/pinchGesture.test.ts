import { Box, DEFAULT_CAMERA_OPTIONS, Vec } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

describe('Pinch gestures', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor({
			options: {
				edgeScrollDelay: 0,
				edgeScrollEaseDuration: 0,
			},
		})
		editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
	})

	// Helper function to simulate a pinch gesture with consistent physical finger movement
	function simulatePinchGesture(options: {
		// Initial zoom level
		initialZoom: number
		// Simulated pinch z-delta (positive = zoom in, negative = zoom out)
		pinchDelta: number
		// Zoom speed setting
		zoomSpeed?: number
	}) {
		const { initialZoom, pinchDelta, zoomSpeed = 1 } = options

		// Set initial zoom and camera options
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed })
		editor.setCamera(new Vec(0, 0, initialZoom), { immediate: true })

		// Point at the center of the viewport
		const centerX = 800
		const centerY = 450

		// Dispatch the synthetic pinch events
		editor
			.dispatch({
				type: 'pinch',
				name: 'pinch_start',
				point: { x: centerX, y: centerY, z: initialZoom },
				delta: { x: 0, y: 0, z: 0 },
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})
			.forceTick()

		editor
			.dispatch({
				type: 'pinch',
				name: 'pinch',
				point: { x: centerX, y: centerY, z: initialZoom },
				delta: { x: 0, y: 0, z: pinchDelta },
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})
			.forceTick()

		editor
			.dispatch({
				type: 'pinch',
				name: 'pinch_end',
				point: { x: centerX, y: centerY, z: initialZoom },
				delta: { x: 0, y: 0, z: pinchDelta },
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})
			.forceTick()

		return {
			startZoom: initialZoom,
			endZoom: editor.getZoomLevel(),
			zoomChange: editor.getZoomLevel() - initialZoom,
			zoomRatio: editor.getZoomLevel() / initialZoom,
		}
	}

	it('produces consistent absolute zoom changes for the same delta at different zoom levels', () => {
		// Same delta at different zoom levels should produce the same absolute change
		const pinchDelta = 0.5

		// Test at zoom level 1
		const result1 = simulatePinchGesture({
			initialZoom: 1,
			pinchDelta,
		})

		// Test at zoom level 2
		const result2 = simulatePinchGesture({
			initialZoom: 2,
			pinchDelta,
		})

		// Test at zoom level 0.5
		const result3 = simulatePinchGesture({
			initialZoom: 0.5,
			pinchDelta,
		})

		// The absolute zoom change should be the same in all cases
		// if we're feeding the same delta value to the editor
		expect(result1.zoomChange).toBeCloseTo(pinchDelta, 2)
		expect(result2.zoomChange).toBeCloseTo(pinchDelta, 2)
		expect(result3.zoomChange).toBeCloseTo(pinchDelta, 2)

		// Log the results for clarity
		console.log('Zoom changes:', {
			'From zoom 1.0': `${result1.startZoom} → ${result1.endZoom} (Δ ${result1.zoomChange})`,
			'From zoom 2.0': `${result2.startZoom} → ${result2.endZoom} (Δ ${result2.zoomChange})`,
			'From zoom 0.5': `${result3.startZoom} → ${result3.endZoom} (Δ ${result3.zoomChange})`,
		})
	})

	it('scales zoom changes according to zoomSpeed setting', () => {
		const pinchDelta = 0.5

		// Test with zoom speed 1 (default)
		const result1 = simulatePinchGesture({
			initialZoom: 1,
			pinchDelta,
			zoomSpeed: 1,
		})

		// Test with zoom speed 2
		const result2 = simulatePinchGesture({
			initialZoom: 1,
			pinchDelta,
			zoomSpeed: 2,
		})

		// Test with zoom speed 0.5
		const result3 = simulatePinchGesture({
			initialZoom: 1,
			pinchDelta,
			zoomSpeed: 0.5,
		})

		// Zoom changes should be proportional to zoom speed
		const baseZoomChange = result1.zoomChange
		expect(result2.zoomChange).toBeCloseTo(baseZoomChange * 2, 2)
		expect(result3.zoomChange).toBeCloseTo(baseZoomChange * 0.5, 2)
	})

	it('produces consistent zoom experiences with realistic finger movements', () => {
		// Set zoomSpeed to 1 for all tests
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 1 })

		// Initial finger distance in pixels (arbitrary value)
		const initialFingerDistance = 100

		// We'll simulate pinching out by 50px at each zoom level
		const fingerMovement = 50

		// Formula for calculating the appropriate delta based on finger movement and current zoom
		// This simulates what @use-gesture/react would calculate
		function calculatePinchDelta(
			fingerDistChange: number,
			startDistance: number,
			currentZoom: number
		) {
			// In @use-gesture, the scale factor is calculated as (currentDistance/initialDistance)
			// When pinching, offset[0] represents the current scale factor
			// The delta (dz) is the change in scale: (newDistance/initialDistance - 1) * currentZoom
			const newDistance = startDistance + fingerDistChange
			const scaleFactor = newDistance / startDistance
			return (scaleFactor - 1) * currentZoom
		}

		// Test at zoom level 1
		const delta1 = calculatePinchDelta(fingerMovement, initialFingerDistance, 1)
		const result1 = simulatePinchGesture({
			initialZoom: 1,
			pinchDelta: delta1,
		})

		// Test at zoom level 2
		const delta2 = calculatePinchDelta(fingerMovement, initialFingerDistance, 2)
		const result2 = simulatePinchGesture({
			initialZoom: 2,
			pinchDelta: delta2,
		})

		// Test at zoom level 0.5
		const delta3 = calculatePinchDelta(fingerMovement, initialFingerDistance, 0.5)
		const result3 = simulatePinchGesture({
			initialZoom: 0.5,
			pinchDelta: delta3,
		})

		// Log the deltas and results
		console.log('Calculated deltas for same physical finger movement:', {
			'At zoom 1.0': delta1,
			'At zoom 2.0': delta2,
			'At zoom 0.5': delta3,
		})

		console.log('Zoom ratios after applying appropriate deltas:', {
			'From zoom 1.0': result1.zoomRatio,
			'From zoom 2.0': result2.zoomRatio,
			'From zoom 0.5': result3.zoomRatio,
		})

		// The zoom ratio should be the same for all starting zoom levels
		// when applying the appropriately calculated deltas
		expect(result1.zoomRatio).toBeCloseTo(result2.zoomRatio, 2)
		expect(result1.zoomRatio).toBeCloseTo(result3.zoomRatio, 2)
	})

	// Is this necessary?
	it('produces inverse zoom effects when the same finger movement is reversed', () => {
		// Set zoomSpeed to 1 for all tests
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 1 })

		// Initial finger distance in pixels (arbitrary value)
		const initialFingerDistance = 100

		// Finger movement outward (pinch out)
		const fingerMovementOut = 50

		// Finger movement inward (pinch in) - same magnitude but opposite direction
		const fingerMovementIn = -50

		// Helper function to calculate pinch delta based on finger movement
		function calculatePinchDelta(
			fingerDistChange: number,
			startDistance: number,
			currentZoom: number
		) {
			const newDistance = startDistance + fingerDistChange
			const scaleFactor = newDistance / startDistance
			return (scaleFactor - 1) * currentZoom
		}

		// Starting from zoom level 1
		const initialZoom = 1

		// Step 1: Zoom in by pinching out
		const deltaOut = calculatePinchDelta(fingerMovementOut, initialFingerDistance, initialZoom)
		const resultOut = simulatePinchGesture({
			initialZoom,
			pinchDelta: deltaOut,
		})

		// Record the zoom level after pinching out
		const zoomAfterPinchOut = resultOut.endZoom

		// Step 2: Zoom out by pinching in (from the new zoom level)
		const deltaIn = calculatePinchDelta(fingerMovementIn, initialFingerDistance, zoomAfterPinchOut)
		const resultIn = simulatePinchGesture({
			initialZoom: zoomAfterPinchOut,
			pinchDelta: deltaIn,
		})

		// Calculate expected final zoom
		// If we started at zoom 1 and ended up at zoom 1.5 after pinching out,
		// then pinching in by the same amount should give us 1.5 / 1.5 = 1.0
		const expectedFinalZoom = initialZoom

		// Log results
		console.log('Pinch reversal test:', {
			'Initial zoom': initialZoom,
			'Zoom after pinch out': zoomAfterPinchOut,
			'Zoom after pinch in': resultIn.endZoom,
			'Expected final zoom': expectedFinalZoom,
			'Zoom out ratio': resultOut.zoomRatio,
			'Zoom in ratio': resultIn.zoomRatio,
			'Product of ratios': resultOut.zoomRatio * resultIn.zoomRatio,
		})

		// The product of the zoom ratios should be close to 1
		// (e.g., if zoom out ratio is 1.5, zoom in ratio should be ~0.667, and 1.5 * 0.667 ≈ 1)
		expect(resultOut.zoomRatio * resultIn.zoomRatio).toBeCloseTo(1, 1)

		// Final zoom should be close to the initial zoom
		expect(resultIn.endZoom).toBeCloseTo(initialZoom, 1)

		// Try at a different zoom level - start at 2
		const initialZoom2 = 2

		const deltaOut2 = calculatePinchDelta(fingerMovementOut, initialFingerDistance, initialZoom2)
		const resultOut2 = simulatePinchGesture({
			initialZoom: initialZoom2,
			pinchDelta: deltaOut2,
		})

		const zoomAfterPinchOut2 = resultOut2.endZoom

		const deltaIn2 = calculatePinchDelta(
			fingerMovementIn,
			initialFingerDistance,
			zoomAfterPinchOut2
		)
		const resultIn2 = simulatePinchGesture({
			initialZoom: zoomAfterPinchOut2,
			pinchDelta: deltaIn2,
		})

		console.log('Pinch reversal test at zoom 2:', {
			'Initial zoom': initialZoom2,
			'Zoom after pinch out': zoomAfterPinchOut2,
			'Zoom after pinch in': resultIn2.endZoom,
			'Expected final zoom': initialZoom2,
			'Product of ratios': resultOut2.zoomRatio * resultIn2.zoomRatio,
		})

		// The product of the zoom ratios should be close to 1
		expect(resultOut2.zoomRatio * resultIn2.zoomRatio).toBeCloseTo(1, 1)

		// Final zoom should be close to the initial zoom
		expect(resultIn2.endZoom).toBeCloseTo(initialZoom2, 1)
	})
})
