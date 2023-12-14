import { createShapeId, TLImageShape } from '@tldraw/editor'
import { MIN_CROP_SIZE } from '../lib/tools/SelectTool/childStates/Crop/crop-constants'
import { TestEditor } from './TestEditor'

jest.useFakeTimers()

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	imageA: createShapeId('imageA'),
	imageB: createShapeId('imageB'),
	boxA: createShapeId('boxA'),
}

const imageWidth = 1200
const imageHeight = 800

const imageProps = {
	assetId: null,
	playing: true,
	url: '',
	w: imageWidth,
	h: imageHeight,
}

beforeEach(() => {
	editor = new TestEditor()

	// this side effect is normally added via a hook
	editor.sideEffects.registerAfterChangeHandler('instance_page_state', (prev, next) => {
		if (prev.croppingShapeId !== next.croppingShapeId) {
			const isInCroppingState = editor.isInAny(
				'select.crop',
				'select.pointing_crop_handle',
				'select.cropping'
			)
			if (!prev.croppingShapeId && next.croppingShapeId) {
				if (!isInCroppingState) {
					editor.setCurrentTool('select.crop.idle')
				}
			} else if (prev.croppingShapeId && !next.croppingShapeId) {
				if (isInCroppingState) {
					editor.setCurrentTool('select.idle')
				}
			}
		}
	})

	editor.createShapes([
		{
			id: ids.imageA,
			type: 'image',
			x: 100,
			y: 100,
			props: imageProps,
		},
		{
			id: ids.imageB,
			type: 'image',
			x: 500,
			y: 500,
			props: {
				...imageProps,
				w: imageWidth / 2,
				h: imageHeight / 2,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 0.5, y: 0.5 },
				},
			},
		},
		{
			id: ids.boxA,
			type: 'geo',
			x: 1000,
			y: 1000,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
})

describe('When in the select.idle state', () => {
	it('double clicking an image should transition to select.crop', () => {
		editor.select(ids.boxA)

		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.boxA])
		expect(editor.getCroppingShapeId()).toBe(null)

		editor.doubleClick(550, 550, ids.imageB)
		editor.expectToBeIn('select.crop.idle')

		expect(editor.getSelectedShapeIds()).toMatchObject([ids.imageB])
		expect(editor.getCroppingShapeId()).toBe(ids.imageB)

		editor.undo()

		// first selection should have been a mark
		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.imageB])
		expect(editor.getCroppingShapeId()).toBe(null)

		editor.undo()

		// back to start
		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.boxA])
		expect(editor.getCroppingShapeId()).toBe(null)

		editor
			.redo() // select again
			.redo() // crop again

		editor.expectToBeIn('select.crop.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.imageB])
		expect(editor.getCroppingShapeId()).toBe(ids.imageB)
	})

	it('when ONLY ONE image is selected double clicking a selection handle should transition to select.crop', () => {
		// when two shapes are selected, double click should not transition

		// corner (two shapes)
		editor
			.expectToBeIn('select.idle')
			.select(ids.imageA, ids.imageB)
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectToBeIn('select.idle')

		expect(editor.getCroppingShapeId()).toBe(null)

		// edge (two shapes)
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom',
			})
			.expectToBeIn('select.idle')

		expect(editor.getCroppingShapeId()).toBe(null)

		// corner (one shape)
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectToBeIn('select.crop.idle')

		expect(editor.getCroppingShapeId()).toBe(ids.imageB)

		// edge (one shape)
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom',
			})
			.expectToBeIn('select.crop.idle')

		expect(editor.getCroppingShapeId()).toBe(ids.imageB)
	})

	it('when only an image is selected pressing enter should transition to select.crop', () => {
		// two shapes
		editor
			.expectToBeIn('select.idle')
			.select(ids.imageA, ids.imageB)
			.keyDown('Enter')
			.keyUp('Enter')
			.expectToBeIn('select.idle')

		// one image
		editor
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.keyDown('Enter')
			.keyUp('Enter')
			.expectToBeIn('select.crop.idle')

		expect(editor.getCroppingShapeId()).toBe(ids.imageB)
	})

	it('when only an image is selected control-pointing a selection handle should transition to select.pointing_crop_handle', () => {
		// two shapes / edge
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageA, ids.imageB)
			.pointerDown(500, 550, { target: 'selection', handle: 'bottom', ctrlKey: true })
			.expectToBeIn('select.brushing')

		// two shapes / corner
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageA, ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.brushing')

		// one shape / edge
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 550, { target: 'selection', handle: 'bottom', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')

		// one shape / corner
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
	})
})

describe('When in the crop.idle state', () => {
	it('pressing escape should transition to select.idle', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.cancel()
			.expectToBeIn('select.idle')
	})

	it('pressing enter should transition to select.idle', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.keyDown('Enter')
			.keyUp('Enter')
			.expectToBeIn('select.idle')
	})

	it('pointing the canvas should point canvas', () => {
		editor
			.expectToBeIn('select.idle')
			.pointerMove(-100, -100)
			.pointerDown()
			.expectToBeIn('select.pointing_canvas')
	})

	it('pointing some other shape should start pointing the shape', () => {
		editor
			.expectToBeIn('select.idle')
			.pointerMove(550, 500)
			.pointerDown()
			.expectToBeIn('select.pointing_shape')
	})

	it('pointing a selection handle should enter the select.pointing_crop_handle state', () => {
		// corner
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: false })
			.expectToBeIn('select.pointing_crop_handle')

		//reset
		editor.cancel().cancel()

		// edge
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectToBeIn('select.pointing_crop_handle')
	})

	it('pointing the cropping image should enter the select.crop.translating_crop state', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')

		expect(editor.getCroppingShapeId()).toBe(ids.imageB)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.imageB])
	})

	it('clicking another image shape should set that shape as the new cropping shape and transition to pointing_crop', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(100, 100, { target: 'shape', shape: editor.getShape(ids.imageA) })
			.expectToBeIn('select.crop.pointing_crop')

		expect(editor.getCroppingShapeId()).toBe(ids.imageA)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.imageA])
	})

	it('rotating will return to select.crop.idle', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'top_left_rotate' })
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.rotating')
			.pointerUp()
			.expectToBeIn('select.crop.idle')
	})

	it('nudges the cropped image', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')

		const crop = () => editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 0.5, y: 0.5 },
		})

		editor.keyDown('ArrowDown')

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.00125 },
			bottomRight: { x: 0.5, y: 0.50125 },
		})

		editor.keyRepeat('ArrowDown')
		editor.keyRepeat('ArrowDown')
		editor.keyRepeat('ArrowDown')
		editor.keyRepeat('ArrowDown')
		editor.keyUp('ArrowDown')

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.0062 },
			bottomRight: { x: 0.5, y: 0.5062 },
		})

		// Undoing should go back to the keydown state, all those
		// repeats should be ephemeral and squashed down
		editor.undo()
		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 0.5, y: 0.5 },
		})

		editor.redo()
		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.0062 },
			bottomRight: { x: 0.5, y: 0.5062 },
		})
	})
})

describe('When in the select.crop.pointing_crop state', () => {
	it('pressing escape / cancel returns to select.crop.idle', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')
			.cancel()
			.expectToBeIn('select.crop.idle')
	})
	it('dragging enters select.crop.translating_crop', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')
			.pointerMove(560, 560)
			.expectToBeIn('select.crop.translating_crop')
	})
})

describe('When in the select.crop.translating_crop state', () => {
	it('moving the pointer should adjust the crop', () => {
		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')

		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(before.topLeft.x).toBe(0)
		expect(before.topLeft.y).toBe(0)
		expect(before.bottomRight.x).toBe(0.5)
		expect(before.bottomRight.y).toBe(0.5)

		// Move the pointer to the left
		editor
			.pointerMove(550 - imageWidth / 4, 550 - imageHeight / 4)
			.expectToBeIn('select.crop.translating_crop')

		// Update should have run right away
		const afterFirst = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterFirst.topLeft.x).toBe(0.25)
		expect(afterFirst.topLeft.y).toBe(0.25)
		expect(afterFirst.bottomRight.x).toBe(0.75)
		expect(afterFirst.bottomRight.y).toBe(0.75)

		// and back to the start
		editor.pointerMove(550, 550)

		// Update should have run right away
		const afterSecond = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterSecond.topLeft.x).toBe(0)
		expect(afterSecond.topLeft.y).toBe(0)
		expect(afterSecond.bottomRight.x).toBe(0.5)
		expect(afterSecond.bottomRight.y).toBe(0.5)

		// and back to the left again (first)
		editor.pointerMove(250, 250)

		const afterEnd = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor.pointerUp()

		editor.undo()

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)

		editor.redo()

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(afterEnd)
	})

	it('moving the pointer while holding shift should adjust the crop', () => {
		editor
			.doubleClick(550, 550, ids.imageB)
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.keyDown('Shift')
			.pointerMove(550 - imageWidth / 8, 550 - imageHeight / 8)
			.expectToBeIn('select.crop.translating_crop')

		// Update should have run right away
		const afterShiftDown = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftDown).toMatchObject({
			topLeft: { x: 0.125, y: 0 },
			bottomRight: { x: 0.625, y: 0.5 },
		})

		editor.keyUp('Shift')
		jest.advanceTimersByTime(500)

		const afterShiftUp = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftUp).toMatchObject({
			topLeft: { x: 0.125, y: 0.125 },
			bottomRight: { x: 0.625, y: 0.625 },
		})

		editor.keyDown('Shift')

		const afterShiftDownAgain = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftDownAgain).toMatchObject(afterShiftDown)
	})

	it('pressing escape / cancel should bail on that change and transition to select.crop.idle', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')
			.pointerMove(250, 250)
			.expectToBeIn('select.crop.translating_crop')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)

		editor.cancel().expectToBeIn('select.crop.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('pressing enter / pointer up / complete should transition to select.crop.idle', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.pointing_crop')
			.pointerMove(250, 250)
			.expectToBeIn('select.crop.translating_crop')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)

		editor.keyDown('Enter').keyUp('Enter').expectToBeIn('select.crop.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})
})

describe('When in the select.pointing_crop_handle state', () => {
	it('moving the pointer should transition to select.cropping', () => {
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')
	})

	it('when entered from select.idle, pressing escape / cancel should return to idle and clear cropping idle', () => {
		// coming from select.idle
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
			.cancel()
			.expectToBeIn('select.idle')

		expect(editor.getCroppingShapeId()).toBe(null)
	})

	it('when entered from select.crop.idle, pressing escape / cancel should return to select.crop.idle and preserve croppingShapeId', () => {
		// coming from idle
		editor
			.cancel()
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: false })
			.expectToBeIn('select.pointing_crop_handle')
			.cancel()
			.expectToBeIn('select.crop.idle')

		expect(editor.getCroppingShapeId()).toBe(ids.imageB)
	})
})

describe('When in the select.cropping state', () => {
	it('moving the pointer should adjust the crop', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})

	it('escape / cancel should revert the change and transition to select.idle when that is the history state', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')
			.cancel()
			.expectToBeIn('select.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('escape / cancel should revert the change and transition to crop.idle when that is the history state', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.cancel()
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')
			.cancel()
			.expectToBeIn('select.crop.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('pointer up / complete should commit the change and transition to crop.idle when that is the history state', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.cancel()
			.expectToBeIn('select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectToBeIn('select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')
			.pointerUp()
			.expectToBeIn('select.crop.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
		editor.undo()
		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
		editor.redo()
		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})

	it('pointer up / complete should commit the change and transition to select.idle when that is the history state', () => {
		const before = editor.getShape<TLImageShape>(ids.imageB)!.props.crop!

		editor
			.cancel()
			.expectToBeIn('select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectToBeIn('select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectToBeIn('select.cropping')
			.pointerUp()
			.expectToBeIn('select.idle')

		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
		editor.undo()
		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
		editor.redo()
		expect(editor.getShape<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})
})

describe('When cropping...', () => {
	it('Correctly stops the crop when the crop is smaller than the minimum crop size', () => {
		const imageX = 100
		const imageY = 100
		// Crop the image to 0x0 which is below mimimum crop size
		const moveX = imageWidth
		const moveY = imageHeight

		const stoppingCropX = (imageWidth - MIN_CROP_SIZE) / imageWidth
		const stoppingCropY = (imageHeight - MIN_CROP_SIZE) / imageHeight
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX,
				imageY,
				{
					target: 'selection',
					handle: 'top_left',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + moveX, imageY + moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX + (imageWidth - MIN_CROP_SIZE),
				y: imageY + (imageHeight - MIN_CROP_SIZE),
				props: {
					...imageProps,
					crop: {
						topLeft: { x: stoppingCropX, y: stoppingCropY },
						bottomRight: { x: 1, y: 1 },
					},
					w: MIN_CROP_SIZE,
					h: MIN_CROP_SIZE,
				},
			})
	})

	it('Correctly resets the crop when double clicking a corner', () => {
		editor
			.doubleClick(550, 550, { target: 'shape', shape: editor.getShape(ids.imageB) })
			.expectToBeIn('select.crop.idle')
			.expectShapeToMatch({
				id: ids.imageB,
				x: 500,
				y: 500,
				props: {
					w: imageWidth / 2,
					h: imageHeight / 2,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 0.5, y: 0.5 },
					},
				},
			})
			.doubleClick(500, 500, { target: 'selection', handle: 'top_left' })
			.expectToBeIn('select.crop.idle')
			.expectShapeToMatch({
				id: ids.imageB,
				x: 500,
				y: 500,
				props: {
					w: imageWidth,
					h: imageHeight,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 },
					},
				},
			})
	})

	it('Crop the image from the top left', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const cropY = 0.75
		const moveX = imageWidth * cropX
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX,
				imageY,
				{
					target: 'selection',
					handle: 'top_left',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + moveX, imageY + moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX + moveX,
				y: imageY + moveY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: cropX, y: cropY },
						bottomRight: { x: 1, y: 1 },
					},
					w: imageWidth - moveX,
					h: imageHeight - moveY,
				},
			})
	})

	it('Crop the image from the top right', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const cropY = 0.75
		const moveX = imageWidth * cropX
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX + imageWidth,
				imageY,
				{
					target: 'selection',
					handle: 'top_right',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + imageWidth - moveX, imageY + moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX,
				y: imageY + moveY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: 0, y: cropY },
						bottomRight: { x: cropX, y: 1 },
					},
					w: imageWidth - moveX,
					h: imageHeight - moveY,
				},
			})
	})

	it('Crop the image from the bottom left', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const cropY = 0.75
		const moveX = imageWidth * cropX
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX,
				imageY + imageHeight,
				{
					target: 'selection',
					handle: 'bottom_left',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + moveX, imageY + imageHeight - moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX + moveX,
				y: imageY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: cropX, y: 0 },
						bottomRight: { x: 1, y: 1 - cropY },
					},
					w: imageWidth - moveX,
					h: imageHeight - moveY,
				},
			})
	})

	it('Crop the image from the bottom right', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const cropY = 0.75
		const moveX = imageWidth * cropX
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX + imageWidth,
				imageY + imageHeight,
				{
					target: 'selection',
					handle: 'bottom_right',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + imageWidth - moveX, imageY + imageHeight - moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX,
				y: imageY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1 - cropX, y: 1 - cropY },
					},
					w: imageWidth - moveX,
					h: imageHeight - moveY,
				},
			})
	})

	it('Crop the image from the left', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const moveX = imageWidth * cropX
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX,
				imageY + imageHeight / 2,
				{
					target: 'selection',
					handle: 'left',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + moveX, imageY + imageHeight / 2)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX + moveX,
				y: imageY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: cropX, y: 0 },
						bottomRight: { x: 1, y: 1 },
					},
					w: imageWidth - moveX,
					h: imageHeight,
				},
			})
	})

	it('Crop the image from the top', () => {
		const imageX = 100
		const imageY = 100
		const cropY = 0.75
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX + imageWidth / 2,
				imageY,
				{
					target: 'selection',
					handle: 'top',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + imageWidth / 2, imageY + moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX,
				y: imageY + moveY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: 0, y: cropY },
						bottomRight: { x: 1, y: 1 },
					},
					w: imageWidth,
					h: imageHeight - moveY,
				},
			})
	})

	it('Crop the image from the right', () => {
		const imageX = 100
		const imageY = 100
		const cropX = 0.5
		const moveX = imageWidth * cropX
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX + imageWidth,
				imageY + imageHeight / 2,
				{
					target: 'selection',
					handle: 'right',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(150, 150)
			.expectToBeIn('select.cropping')
			.pointerMove(imageX + imageWidth - moveX, imageY + imageHeight / 2)
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX,
				y: imageY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1 - cropX, y: 1 },
					},
					w: imageWidth - moveX,
					h: imageHeight,
				},
			})
	})

	it('Crop the image from the bottom', () => {
		const imageX = 100
		const imageY = 100
		const cropY = 0.75
		const moveY = imageHeight * cropY
		editor
			.select(ids.imageA)
			.pointerDown(
				imageX + imageWidth / 2,
				imageY + imageHeight,
				{
					target: 'selection',
					handle: 'bottom',
				},
				{ ctrlKey: true }
			)
			.expectToBeIn('select.pointing_crop_handle')
			.expectShapeToMatch({ id: ids.imageA, x: imageX, y: imageY, props: imageProps })
			.pointerMove(imageX + imageWidth / 2, imageY + imageHeight - moveY)
			.expectToBeIn('select.cropping')
			.expectShapeToMatch({
				id: ids.imageA,
				x: imageX,
				y: imageY,
				props: {
					...imageProps,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 - cropY },
					},
					w: imageWidth,
					h: imageHeight - moveY,
				},
			})
	})
})
