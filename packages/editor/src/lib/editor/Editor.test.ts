import { Box, createShapeId, createTLStore } from '../..'
import { Editor } from './Editor'

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [] }),
		getContainer: () => document.body,
	})
	editor.setCameraOptions({ isLocked: true })
	editor.setCamera = jest.fn()
	editor.user.getAnimationSpeed = jest.fn()
})

describe('centerOnPoint', () => {
	it('no-op when isLocked is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 }, { force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomToFit', () => {
	it('no-op when isLocked is set', () => {
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit({ force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('resetZoom', () => {
	it('no-op when isLocked is set', () => {
		editor.resetZoom()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.resetZoom(undefined, { force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomIn', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomIn()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomIn(undefined, { force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomOut', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomOut()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomOut(undefined, { force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomToSelection', () => {
	it('no-op when isLocked is set', () => {
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection({ force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('slideCamera', () => {
	it('no-op when isLocked is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 } })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.user.getAnimationSpeed).not.toHaveBeenCalled()
	})

	it('performs animation when isLocked is set and force flag is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 }, force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.user.getAnimationSpeed).toHaveBeenCalled()
	})
})

describe('zoomToBounds', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 }, { force: true })
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(editor.setCamera).toHaveBeenCalled()
	})
})
