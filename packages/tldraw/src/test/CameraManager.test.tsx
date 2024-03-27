import { noop } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe('setOptions', () => {
	it('warns if min zoom is greater than max', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(noop)
		editor.camera.setOptions({ zoom: { min: 2, max: 1 } })
		expect(warn).toHaveBeenCalledWith(
			'[tldraw] the minimum zoom level is greater than the maximum zoom level'
		)
	})

	it('warns if min zoom is greater than smallest zoom step', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(noop)
		editor.camera.setOptions({ zoom: { min: 1.5, stops: [1, 2, 3] } })
		expect(warn).toHaveBeenCalledWith(
			'[tldraw] the lowest zoom stop is less than the minimum zoom level'
		)
	})

	it('warns if max zoom is less than largest zoom step', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(noop)
		editor.camera.setOptions({ zoom: { max: 2.5, stops: [1, 2, 3] } })
		expect(warn).toHaveBeenCalledWith(
			'[tldraw] the highest zoom stop is greater than the maximum zoom level'
		)
	})

	it('sorts zoom levels', () => {
		editor.camera.setOptions({ zoom: { stops: [3, 1, 2] } })
		expect(editor.camera.getZoomStops()).toEqual([1, 2, 3])
	})

	it('zooms out if the min zoom increases past the current zoom', () => {
		expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.camera.setOptions({ zoom: { min: 2, stops: [] } })
		expect(editor.camera.get()).toMatchObject({ x: -270, y: -180, z: 2 })
	})

	it('zooms in if the max zoom decreases past the current zoom', () => {
		expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.camera.setOptions({ zoom: { max: 0.5, stops: [] } })
		expect(editor.camera.get()).toMatchObject({ x: 540, y: 360, z: 0.5 })
	})
})
