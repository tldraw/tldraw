import { TLImageShape, createCustomShapeId } from '@tldraw/tlschema'
import { MIN_CROP_SIZE } from '../../constants'
import { TestEditor } from '../TestEditor'

jest.useFakeTimers()

let app: TestEditor

afterEach(() => {
	app?.dispose()
})

const ids = {
	imageA: createCustomShapeId('imageA'),
	imageB: createCustomShapeId('imageB'),
	boxA: createCustomShapeId('boxA'),
}

const imageWidth = 1200
const imageHeight = 800

const imageProps = {
	opacity: '1',
	assetId: null,
	playing: true,
	url: '',
	w: imageWidth,
	h: imageHeight,
}

beforeEach(() => {
	app = new TestEditor()

	app.createShapes([
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
		app.select(ids.boxA)

		app.expectPathToBe('root.select.idle')
		expect(app.selectedIds).toMatchObject([ids.boxA])
		expect(app.croppingId).toBe(null)

		app.doubleClick(550, 550, ids.imageB)
		app.expectPathToBe('root.select.crop.idle')

		expect(app.selectedIds).toMatchObject([ids.imageB])
		expect(app.croppingId).toBe(ids.imageB)

		app.undo()

		// first selection should have been a mark
		app.expectPathToBe('root.select.idle')
		expect(app.selectedIds).toMatchObject([ids.imageB])
		expect(app.croppingId).toBe(null)

		app.undo()

		// back to start
		app.expectPathToBe('root.select.idle')
		expect(app.selectedIds).toMatchObject([ids.boxA])
		expect(app.croppingId).toBe(null)

		app.redo().redo()

		app.expectPathToBe('root.select.idle')
		expect(app.selectedIds).toMatchObject([ids.imageB])
		expect(app.croppingId).toBe(ids.imageB) // todo: fix this! we shouldn't set this on redo
	})

	it('when ONLY ONE image is selected double clicking a selection handle should transition to select.crop', () => {
		// when two shapes are selected, double click should not transition

		// corner (two shapes)
		app
			.expectPathToBe('root.select.idle')
			.select(ids.imageA, ids.imageB)
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectPathToBe('root.select.idle')

		expect(app.croppingId).toBe(null)

		// edge (two shapes)
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom',
			})
			.expectPathToBe('root.select.idle')

		expect(app.croppingId).toBe(null)

		// corner (one shape)
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectPathToBe('root.select.crop.idle')

		expect(app.croppingId).toBe(ids.imageB)

		// edge (one shape)
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, {
				target: 'selection',
				handle: 'bottom',
			})
			.expectPathToBe('root.select.crop.idle')

		expect(app.croppingId).toBe(ids.imageB)
	})

	it('when only an image is selected pressing enter should transition to select.crop', () => {
		// two shapes
		app
			.expectPathToBe('root.select.idle')
			.select(ids.imageA, ids.imageB)
			.keyDown('Enter')
			.keyUp('Enter')
			.expectPathToBe('root.select.idle')

		// one image
		app
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.keyDown('Enter')
			.keyUp('Enter')
			.expectPathToBe('root.select.crop.idle')

		expect(app.croppingId).toBe(ids.imageB)
	})

	it('when only an image is selected control-pointing a selection handle should transition to select.pointing_crop_handle', () => {
		// two shapes / edge
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageA, ids.imageB)
			.pointerDown(500, 550, { target: 'selection', handle: 'bottom', ctrlKey: true })
			.expectPathToBe('root.select.brushing')

		// two shapes / corner
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageA, ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.brushing')

		// one shape / edge
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 550, { target: 'selection', handle: 'bottom', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')

		// one shape / corner
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
	})
})

describe('When in the crop.idle state', () => {
	it('pressing escape should transition to select.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.cancel()
			.expectPathToBe('root.select.idle')
	})

	it('pressing enter should transition to select.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.keyDown('Enter')
			.keyUp('Enter')
			.expectPathToBe('root.select.idle')
	})

	it('pointing the canvas should return to select.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.click(550, 550, { target: 'canvas' })
			.expectPathToBe('root.select.idle')
	})

	it('pointing some other shape should return to select.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.click(550, 550, { target: 'shape', shape: app.getShapeById(ids.boxA) })
			.expectPathToBe('root.select.idle')
	})

	it('pointing a selection handle should enter the select.pointing_crop_handle state', () => {
		// corner
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: false })
			.expectPathToBe('root.select.pointing_crop_handle')

		//reset
		app.cancel().cancel()

		// edge
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectPathToBe('root.select.pointing_crop_handle')
	})

	it('pointing the cropping image should enter the select.crop.translating_crop state', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')

		expect(app.croppingId).toBe(ids.imageB)
		expect(app.selectedIds).toMatchObject([ids.imageB])
	})

	it('clicking another image shape should set that shape as the new cropping shape and transition to pointing_crop', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(100, 100, { target: 'shape', shape: app.getShapeById(ids.imageA) })
			.expectPathToBe('root.select.crop.pointing_crop')

		expect(app.croppingId).toBe(ids.imageA)
		expect(app.selectedIds).toMatchObject([ids.imageA])
	})

	it('rotating will return to select.crop.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'top_left_rotate' })
			.expectPathToBe('root.select.pointing_rotate_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.rotating')
			.pointerUp()
			.expectPathToBe('root.select.crop.idle')
	})

	it('nudges the cropped image', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')

		const crop = () => app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 0.5, y: 0.5 },
		})

		app.keyDown('ArrowDown')

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.00125 },
			bottomRight: { x: 0.5, y: 0.50125 },
		})

		app.keyRepeat('ArrowDown')
		app.keyRepeat('ArrowDown')
		app.keyRepeat('ArrowDown')
		app.keyRepeat('ArrowDown')
		app.keyUp('ArrowDown')

		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.0062 },
			bottomRight: { x: 0.5, y: 0.5062 },
		})

		// Undoing should go back to the keydown state, all those
		// repeats should be ephemeral and squashed down
		app.undo()
		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 0.5, y: 0.5 },
		})

		app.redo()
		expect(crop()).toCloselyMatchObject({
			topLeft: { x: 0, y: 0.0062 },
			bottomRight: { x: 0.5, y: 0.5062 },
		})
	})
})

describe('When in the select.crop.pointing_crop state', () => {
	it('pressing escape / cancel returns to select.crop.idle', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')
			.cancel()
			.expectPathToBe('root.select.crop.idle')
	})
	it('dragging enters select.crop.translating_crop', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')
			.pointerMove(560, 560)
			.expectPathToBe('root.select.crop.translating_crop')
	})
})

describe('When in the select.crop.translating_crop state', () => {
	it('moving the pointer should adjust the crop', () => {
		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')

		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(before.topLeft.x).toBe(0)
		expect(before.topLeft.y).toBe(0)
		expect(before.bottomRight.x).toBe(0.5)
		expect(before.bottomRight.y).toBe(0.5)

		// Move the pointer to the left
		app
			.pointerMove(550 - imageWidth / 4, 550 - imageHeight / 4)
			.expectPathToBe('root.select.crop.translating_crop')

		// Update should have run right away
		const afterFirst = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterFirst.topLeft.x).toBe(0.25)
		expect(afterFirst.topLeft.y).toBe(0.25)
		expect(afterFirst.bottomRight.x).toBe(0.75)
		expect(afterFirst.bottomRight.y).toBe(0.75)

		// and back to the start
		app.pointerMove(550, 550)

		// Update should have run right away
		const afterSecond = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterSecond.topLeft.x).toBe(0)
		expect(afterSecond.topLeft.y).toBe(0)
		expect(afterSecond.bottomRight.x).toBe(0.5)
		expect(afterSecond.bottomRight.y).toBe(0.5)

		// and back to the left again (first)
		app.pointerMove(250, 250)

		const afterEnd = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app.pointerUp()

		app.undo()

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)

		app.redo()

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(afterEnd)
	})

	it('moving the pointer while holding shift should adjust the crop', () => {
		app
			.doubleClick(550, 550, ids.imageB)
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.keyDown('Shift')
			.pointerMove(550 - imageWidth / 8, 550 - imageHeight / 8)
			.expectPathToBe('root.select.crop.translating_crop')

		// Update should have run right away
		const afterShiftDown = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftDown).toMatchObject({
			topLeft: { x: 0.125, y: 0 },
			bottomRight: { x: 0.625, y: 0.5 },
		})

		app.keyUp('Shift')
		jest.advanceTimersByTime(500)

		const afterShiftUp = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftUp).toMatchObject({
			topLeft: { x: 0.125, y: 0.125 },
			bottomRight: { x: 0.625, y: 0.625 },
		})

		app.keyDown('Shift')

		const afterShiftDownAgain = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		expect(afterShiftDownAgain).toMatchObject(afterShiftDown)
	})

	it('pressing escape / cancel should bail on that change and transition to select.crop.idle', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')
			.pointerMove(250, 250)
			.expectPathToBe('root.select.crop.translating_crop')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)

		app.cancel().expectPathToBe('root.select.crop.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('pressing enter / pointer up / complete should transition to select.crop.idle', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
			.expectPathToBe('root.select.crop.pointing_crop')
			.pointerMove(250, 250)
			.expectPathToBe('root.select.crop.translating_crop')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)

		app.keyDown('Enter').keyUp('Enter').expectPathToBe('root.select.crop.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})
})

describe('When in the select.pointing_crop_handle state', () => {
	it('moving the pointer should transition to select.cropping', () => {
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')
	})

	it('when entered from select.idle, pressing escape / cancel should return to idle and clear cropping idle', () => {
		// coming from select.idle
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
			.cancel()
			.expectPathToBe('root.select.idle')

		expect(app.croppingId).toBe(null)
	})

	it('when entered from select.crop.idle, pressing escape / cancel should return to select.crop.idle and preserve croppingId', () => {
		// coming from idle
		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: false })
			.expectPathToBe('root.select.pointing_crop_handle')
			.cancel()
			.expectPathToBe('root.select.crop.idle')

		expect(app.croppingId).toBe(ids.imageB)
	})
})

describe('When in the select.cropping state', () => {
	it('moving the pointer should adjust the crop', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})

	it('escape / cancel should revert the change and transition to select.idle when that is the history state', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')
			.cancel()
			.expectPathToBe('root.select.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('escape / cancel should revert the change and transition to crop.idle when that is the history state', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')
			.cancel()
			.expectPathToBe('root.select.crop.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
	})

	it('pointer up / complete should commit the change and transition to crop.idle when that is the history state', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.doubleClick(550, 550, ids.imageB)
			.expectPathToBe('root.select.crop.idle')
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom', ctrlKey: false })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')
			.pointerUp()
			.expectPathToBe('root.select.crop.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
		app.undo()
		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
		app.redo()
		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
	})

	it('pointer up / complete should commit the change and transition to select.idle when that is the history state', () => {
		const before = app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!

		app
			.cancel()
			.expectPathToBe('root.select.idle')
			.select(ids.imageB)
			.pointerDown(500, 600, { target: 'selection', handle: 'bottom_left', ctrlKey: true })
			.expectPathToBe('root.select.pointing_crop_handle')
			.pointerMove(510, 590)
			.expectPathToBe('root.select.cropping')
			.pointerUp()
			.expectPathToBe('root.select.idle')

		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
		app.undo()
		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).toMatchObject(before)
		app.redo()
		expect(app.getShapeById<TLImageShape>(ids.imageB)!.props.crop!).not.toMatchObject(before)
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
		app
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
		app
			.doubleClick(550, 550, { target: 'shape', shape: app.getShapeById(ids.imageB) })
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
		app
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
		app
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
		app
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
		app
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
		app
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
		app
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
		app
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
		app
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
