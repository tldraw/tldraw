import { createShapeId, StateNode, TLArrowShape, TLImageShape, Vec, VecLike } from '@tldraw/editor'
import { MockInstance, vi } from 'vitest'
import { defaultOverlayUtils } from '../lib/defaultOverlayUtils'
import { TestEditor } from './TestEditor'

// #9499, #10176. The click manager is un-stubbed and presses carry no target, so double-click
// timing and handle hit testing go through the same paths as in the app.

let editor: TestEditor

const ids = {
	box: createShapeId('box'),
	arrow: createShapeId('arrow'),
	image: createShapeId('image'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
	editor._transformPointerDownSpy.mockRestore()
	editor._transformPointerUpSpy.mockRestore()
})

afterEach(() => {
	editor?.dispose()
})

function selectBox() {
	editor.createShapes([{ id: ids.box, type: 'geo', x: 100, y: 100, props: { w: 200, h: 200 } }])
	editor.select(ids.box)
}

function enterCropMode() {
	editor.createShapes([
		{
			id: ids.image,
			type: 'image',
			x: 100,
			y: 100,
			props: {
				assetId: null,
				url: '',
				w: 600,
				h: 400,
				crop: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0.5, y: 0.5 } },
			},
		},
	])
	editor.select(ids.image).setCroppingShape(ids.image).setCurrentTool('select.crop.idle')
}

function getCrop() {
	return editor.getShape<TLImageShape>(ids.image)!.props.crop
}

interface PointingStateCase {
	pointingState: string
	dragState: string
	idleState: string
	setup(): void
	getPressPoint(): VecLike
	didDoubleClick(): boolean
	// Points from the handle toward something else, for pressing at the handle's edge and
	// drifting off it before release
	driftDirection?: VecLike
}

let cropIdleDoubleClick: MockInstance<NonNullable<StateNode['onDoubleClick']>>

const cases: Record<string, PointingStateCase> = {
	'resize handle': {
		pointingState: 'select.pointing_resize_handle',
		dragState: 'select.resizing',
		idleState: 'select.idle',
		setup: selectBox,
		getPressPoint: () => editor.getSelectionHandlePagePoint('bottom_right'),
		didDoubleClick: () => editor.getEditingShapeId() === ids.box,
	},
	'rotate handle': {
		pointingState: 'select.pointing_rotate_handle',
		dragState: 'select.rotating',
		idleState: 'select.idle',
		setup: selectBox,
		getPressPoint: () => editor.getSelectionHandlePagePoint('bottom_right_rotate'),
		didDoubleClick: () => editor.getEditingShapeId() === ids.box,
		driftDirection: { x: 1, y: 1 },
	},
	'shape handle': {
		pointingState: 'select.pointing_handle',
		dragState: 'select.dragging_handle',
		idleState: 'select.idle',
		setup() {
			editor.createShapes([
				{
					id: ids.arrow,
					type: 'arrow',
					x: 100,
					y: 100,
					props: { start: { x: 0, y: 0 }, end: { x: 200, y: 200 }, arrowheadEnd: 'arrow' },
				},
			])
			editor.select(ids.arrow)
		},
		getPressPoint: () => {
			const { x, y, props } = editor.getShape<TLArrowShape>(ids.arrow)!
			return { x: x + props.end.x, y: y + props.end.y }
		},
		didDoubleClick: () => editor.getShape<TLArrowShape>(ids.arrow)!.props.arrowheadEnd === 'none',
		driftDirection: { x: 1, y: 0 },
	},
	'crop handle': {
		pointingState: 'select.crop.pointing_crop_handle',
		dragState: 'select.crop.cropping',
		idleState: 'select.crop.idle',
		setup: enterCropMode,
		getPressPoint: () => editor.getSelectionHandlePagePoint('bottom'),
		// Double clicking a crop edge resets the crop to the full image
		didDoubleClick: () => getCrop()?.bottomRight.x === 1,
		driftDirection: { x: 0, y: 1 },
	},
	'cropped image': {
		pointingState: 'select.crop.pointing_crop',
		dragState: 'select.crop.translating_crop',
		idleState: 'select.crop.idle',
		setup() {
			enterCropMode()
			cropIdleDoubleClick = vi.spyOn(
				editor.getStateDescendant<StateNode>('select.crop.idle')!,
				'onDoubleClick'
			)
		},
		getPressPoint: () => editor.getSelectionPageBounds()!.center,
		// Double clicking the image exits and re-enters crop mode on it, leaving no state to observe
		didDoubleClick: () => cropIdleDoubleClick.mock.calls.some(([info]) => info.phase === 'down'),
	},
}

interface Modifiers {
	shiftKey: boolean
}

function click(c: PointingStateCase, point = c.getPressPoint(), modifiers?: Modifiers) {
	editor
		.pointerMove(point.x, point.y)
		.pointerDown(point.x, point.y, undefined, modifiers)
		.pointerUp(point.x, point.y, undefined, modifiers)
	editor.expectToBeIn(c.idleState)
}

function pressAgain(c: PointingStateCase, point = c.getPressPoint(), modifiers?: Modifiers) {
	editor.pointerDown(point.x, point.y, undefined, modifiers)
	editor.expectToBeIn(c.pointingState)
}

describe.each(Object.entries(cases))('A second press on a %s', (_name, c) => {
	beforeEach(() => {
		c.setup()
		expect(c.didDoubleClick()).toBe(false)
	})

	it('drags when the press moves', () => {
		click(c)
		pressAgain(c)
		editor.pointerMoveBy(30, 30)
		editor.expectToBeIn(c.dragState)
		editor.pointerUp()
		expect(c.didDoubleClick()).toBe(false)
	})

	it('acts as a double click when released in place', () => {
		click(c)
		pressAgain(c)
		editor.pointerUp()
		expect(c.didDoubleClick()).toBe(true)
	})

	it('forgets the double click once the press becomes a drag', () => {
		click(c)
		pressAgain(c)
		editor.pointerMoveBy(30, 30).pointerUp()
		// Let the double-click window lapse so the next press is a plain click
		vi.advanceTimersByTime(1000)
		click(c)
		expect(c.didDoubleClick()).toBe(false)
	})

	it('ignores the double click while shift is held', () => {
		const shift = { shiftKey: true }
		click(c, undefined, shift)
		pressAgain(c, undefined, shift)
		editor.pointerUp(undefined, undefined, undefined, shift)
		editor.expectToBeIn(c.idleState)
		expect(c.didDoubleClick()).toBe(false)
	})
})

describe.each(Object.entries(cases).filter(([, c]) => c.driftDirection))(
	'A second press that drifts off a %s before release',
	(_name, c) => {
		beforeEach(() => {
			c.setup()
		})

		it('still acts as a double click on that handle', () => {
			const direction = Vec.From(c.driftDirection!).uni()
			const edge = getOverlayEdge(c.getPressPoint(), direction)
			const drifted = Vec.Add(edge, Vec.Mul(direction, 3))

			click(c, edge)
			pressAgain(c, edge)
			// Under the drag distance, so the press is still a click
			editor.pointerMove(drifted.x, drifted.y)
			editor.expectToBeIn(c.pointingState)
			editor.pointerUp()
			expect(c.didDoubleClick()).toBe(true)
		})
	}
)

// The last point along `direction` that still hits the overlay under `point`
function getOverlayEdge(point: VecLike, direction: Vec) {
	const margin = editor.getHitTestMargin()
	const id = editor.overlays.getOverlayAtPoint(point, margin)?.id
	expect(id).toBeDefined()
	let edge = Vec.From(point)
	for (let i = 0; i < 100; i++) {
		const next = Vec.Add(edge, direction)
		if (editor.overlays.getOverlayAtPoint(next, margin)?.id !== id) return edge
		edge = next
	}
	throw new Error('No overlay edge within 100px')
}
