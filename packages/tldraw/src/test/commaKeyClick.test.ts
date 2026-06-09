import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

/**
 * Dispatches the pointer events that the comma key handler sends to the editor.
 * The `useFixed` flag controls whether the pointer_up uses the fixed approach
 * (pageToScreen, which produces absolute screen coords) or the old buggy approach
 * (getCurrentScreenPoint, which is already canvas-relative and causes a double
 * subtraction of screenBounds in updateFromEvent).
 */
function simulateCommaKeyClick(useFixed: boolean) {
	const sharedProps = {
		type: 'pointer' as const,
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		pointerId: 0,
		button: 0,
		isPen: false,
		target: 'canvas' as const,
	}

	// pointer_down: both old and new code use pageToScreen (correct absolute coords)
	const { x: pdx, y: pdy, z: pdz } = editor.inputs.getCurrentPagePoint()
	const screenPointDown = editor.pageToScreen({ x: pdx, y: pdy })
	editor.dispatch({
		...sharedProps,
		name: 'pointer_down',
		point: { x: screenPointDown.x, y: screenPointDown.y, z: pdz },
	})

	if (useFixed) {
		// Fixed pointer_up: also use pageToScreen (absolute coords)
		const { x: pux, y: puy, z: puz } = editor.inputs.getCurrentPagePoint()
		const screenPointUp = editor.pageToScreen({ x: pux, y: puy })
		editor.dispatch({
			...sharedProps,
			name: 'pointer_up',
			point: { x: screenPointUp.x, y: screenPointUp.y, z: puz },
		})
	} else {
		// Buggy pointer_up: use getCurrentScreenPoint (canvas-relative — causes double subtraction)
		const { x, y, z } = editor.inputs.getCurrentScreenPoint()
		editor.dispatch({ ...sharedProps, name: 'pointer_up', point: { x, y, z } })
	}
}

describe('comma key click - screenBounds offset', () => {
	it('page point is unchanged after a click when screenBounds has no offset', () => {
		// Default screenBounds has x=0, so both old and new code agree
		editor.pointerMove(200, 200)
		const before = { ...editor.inputs.getCurrentPagePoint() }

		simulateCommaKeyClick(true)

		const after = editor.inputs.getCurrentPagePoint()
		expect(after.x).toBeCloseTo(before.x)
		expect(after.y).toBeCloseTo(before.y)
	})

	it('page point is unchanged after a click when screenBounds has a non-zero x offset (fixed)', () => {
		// Simulate a host that offsets the canvas by 300px (e.g. a wide sidebar)
		editor.setScreenBounds({ x: 300, y: 0, w: 800, h: 600 })
		editor.pointerMove(500, 200) // absolute screen x=500, canvas-relative x=200
		const before = { ...editor.inputs.getCurrentPagePoint() }

		simulateCommaKeyClick(true)

		const after = editor.inputs.getCurrentPagePoint()
		expect(after.x).toBeCloseTo(before.x)
		expect(after.y).toBeCloseTo(before.y)
	})

	it('page point is wrong after a click when screenBounds has a non-zero x offset (regression — old buggy approach)', () => {
		const screenBoundsX = 300
		editor.setScreenBounds({ x: screenBoundsX, y: 0, w: 800, h: 600 })
		editor.pointerMove(500, 200)
		const before = { ...editor.inputs.getCurrentPagePoint() }

		simulateCommaKeyClick(false) // old buggy approach

		// The bug causes pointer_up to land screenBoundsX / camera.z to the left
		const after = editor.inputs.getCurrentPagePoint()
		const cameraZ = editor.getCamera().z
		expect(after.x).toBeCloseTo(before.x - screenBoundsX / cameraZ)
	})
})
