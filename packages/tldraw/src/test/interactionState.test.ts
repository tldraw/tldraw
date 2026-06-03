import { TestEditor } from './TestEditor'

// The five interaction booleans (isPointing / isDragging / isRightPointing /
// isPanning / isSpacebarPanning) are derived from a single `interaction` state.
// These tests lock in that derivation — in particular the overlapping cases
// where more than one boolean is true at once (a pointer is down *and* the
// camera is panning), which the explicit state models directly.

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

function flags() {
	const i = editor.inputs
	return {
		pointing: i.getIsPointing(),
		dragging: i.getIsDragging(),
		rightPointing: i.getIsRightPointing(),
		panning: i.getIsPanning(),
		spacebarPanning: i.getIsSpacebarPanning(),
	}
}

describe('interaction state', () => {
	it('starts idle', () => {
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
		expect(flags()).toEqual({
			pointing: false,
			dragging: false,
			rightPointing: false,
			panning: false,
			spacebarPanning: false,
		})
	})

	it('left-button down then drag: pointing → dragging', () => {
		editor.pointerDown(100, 100)
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'pointing',
			dragging: false,
			rightUndecided: false,
		})
		expect(flags()).toMatchObject({ pointing: true, dragging: false, panning: false })

		editor.pointerMove(200, 200)
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'pointing',
			dragging: true,
			rightUndecided: false,
		})
		expect(flags()).toMatchObject({ pointing: true, dragging: true })

		editor.pointerUp(200, 200)
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
	})

	it('middle-button pan: isPointing and isPanning are both true', () => {
		editor.pointerDown(100, 100, { button: 1 })
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'panning',
			via: 'middle',
			pointerDown: true,
		})
		// The overlap the explicit state makes honest: a pointer is down *and* the
		// camera is panning.
		expect(flags()).toEqual({
			pointing: true,
			dragging: false,
			rightPointing: false,
			panning: true,
			spacebarPanning: false,
		})

		editor.pointerUp(100, 100, { button: 1 })
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
	})

	it('right-button down is right-pointing, then promotes to panning on drag', () => {
		editor.pointerDown(100, 100, { button: 2 })
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'pointing',
			dragging: false,
			rightUndecided: true,
		})
		expect(flags()).toMatchObject({ pointing: true, rightPointing: true, panning: false })

		editor.pointerMove(200, 200)
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'panning',
			via: 'right',
			pointerDown: true,
		})
		// Once it becomes a pan it is no longer "right pointing".
		expect(flags()).toMatchObject({ pointing: true, rightPointing: false, panning: true })

		editor.pointerUp(200, 200, { button: 2 })
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
	})

	it('spacebar pan with no pointer down: panning but not pointing', () => {
		editor.keyDown(' ')
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'panning',
			via: 'spacebar',
			pointerDown: false,
		})
		expect(flags()).toEqual({
			pointing: false,
			dragging: false,
			rightPointing: false,
			panning: true,
			spacebarPanning: true,
		})

		editor.keyUp(' ')
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
	})

	it('spacebar pan with a pointer also down: pointing and spacebar-panning', () => {
		editor.keyDown(' ')
		editor.pointerDown(100, 100)
		expect(editor.inputs.getInteraction()).toEqual({
			name: 'panning',
			via: 'spacebar',
			pointerDown: true,
		})
		expect(flags()).toMatchObject({ pointing: true, panning: true, spacebarPanning: true })

		// Lifting the pointer while the spacebar is still held keeps the pan going.
		editor.pointerUp(100, 100)
		expect(editor.inputs.getIsPanning()).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(false)

		editor.keyUp(' ')
		expect(editor.inputs.getInteraction()).toEqual({ name: 'idle' })
	})
})
