import { VecLike } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

function checkScreenPage(screen: VecLike, page: VecLike) {
	const pageResult = editor.screenToPage(screen)
	expect(pageResult).toMatchObject(page)
	const screenResult = editor.pageToScreen(pageResult)
	expect(screenResult).toMatchObject(screen)
}

describe('viewport.screenToPage', () => {
	it('converts correctly', () => {
		checkScreenPage({ x: 0, y: 0 }, { x: 0, y: 0 })
		checkScreenPage({ x: 100, y: 100 }, { x: 100, y: 100 })
		checkScreenPage({ x: -100, y: -100 }, { x: -100, y: -100 })
	})

	it('converts correctly when zoomed', () => {
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: 0, y: 0 })
		checkScreenPage({ x: 100, y: 100 }, { x: 200, y: 200 })
		checkScreenPage({ x: -100, y: -100 }, { x: -200, y: -200 })
	})

	it('converts correctly when panned', () => {
		editor.setCamera({ x: 100, y: 100 })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: 100, y: 100 }, { x: 0, y: 0 })
		checkScreenPage({ x: -100, y: -100 }, { x: -200, y: -200 })
	})

	it('converts correctly when panned and zoomed', () => {
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: 100, y: 100 }, { x: 100, y: 100 })
		checkScreenPage({ x: -100, y: -100 }, { x: -300, y: -300 })
		checkScreenPage({ x: -150, y: -150 }, { x: -400, y: -400 })
	})

	it('converts correctly when offset', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: -100, y: -100 }, { x: -200, y: -200 })
		checkScreenPage({ x: 100, y: 100 }, { x: 0, y: 0 })
	})

	it('converts correctly when zoomed out', () => {
		// camera at zero, screenbounds at zero, but zoom at .5
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })

		checkScreenPage({ x: 0, y: 0 }, { x: 0, y: 0 })
		checkScreenPage({ x: -100, y: -100 }, { x: -200, y: -200 })
		checkScreenPage({ x: 100, y: 100 }, { x: 200, y: 200 })
	})

	it('converts correctly when zoomed in', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })

		checkScreenPage({ x: 0, y: 0 }, { x: 0, y: 0 })
		checkScreenPage({ x: -100, y: -100 }, { x: -50, y: -50 })
		checkScreenPage({ x: 100, y: 100 }, { x: 50, y: 50 })
	})

	it('converts correctly when zoomed', () => {
		// camera at zero, screenbounds at zero, but zoom at .5
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: 0, y: 0 })
		checkScreenPage({ x: -100, y: -100 }, { x: -200, y: -200 })
		checkScreenPage({ x: 100, y: 100 }, { x: 200, y: 200 })
	})

	it('converts correctly when offset and zoomed', () => {
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })

		checkScreenPage({ x: 0, y: 0 }, { x: -200, y: -200 })
		checkScreenPage({ x: -100, y: -100 }, { x: -400, y: -400 })
		checkScreenPage({ x: 100, y: 100 }, { x: 0, y: 0 })
	})

	it('converts correctly when zoomed and panned', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: -100, y: -100 }, { x: -300, y: -300 })
		checkScreenPage({ x: 100, y: 100 }, { x: 100, y: 100 })
	})

	it('converts correctly when offset', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: -200, y: -200 })
		checkScreenPage({ x: 100, y: 100 }, { x: 0, y: 0 })
		checkScreenPage({ x: 200, y: 200 }, { x: 200, y: 200 })
	})

	it('converts correctly when panned', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 1 })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: 100, y: 100 }, { x: 0, y: 0 })
		checkScreenPage({ x: 200, y: 200 }, { x: 100, y: 100 })
	})

	it('converts correctly when panned and zoomed', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: -100, y: -100 })
		checkScreenPage({ x: 100, y: 100 }, { x: 100, y: 100 })
		checkScreenPage({ x: 200, y: 200 }, { x: 300, y: 300 })
	})

	it('converts correctly when panned and zoomed and offset', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		checkScreenPage({ x: 0, y: 0 }, { x: -300, y: -300 })
		checkScreenPage({ x: 100, y: 100 }, { x: -100, y: -100 })
		checkScreenPage({ x: 200, y: 200 }, { x: 100, y: 100 })
	})
})

describe('viewportPageBounds', () => {
	it('sets the page bounds', () => {
		editor.updateInstanceState({
			screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0, w: 1000, h: 1000 },
		})
		editor.setCamera({ x: 0, y: 0, z: 1 })

		expect(editor.viewportPageBounds).toMatchObject({
			x: -0,
			y: -0,
			w: 1000,
			h: 1000,
		})
	})

	it('sets the page bounds when camera is zoomed', () => {
		editor.updateInstanceState({
			screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0, w: 1000, h: 1000 },
		})
		editor.setCamera({ x: 0, y: 0, z: 2 })

		expect(editor.viewportPageBounds).toMatchObject({
			x: -0,
			y: -0,
			w: 500,
			h: 500,
		})
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		expect(editor.viewportPageBounds).toMatchObject({
			x: -0,
			y: -0,
			w: 2000,
			h: 2000,
		})
	})

	it('sets the page bounds when camera is panned', () => {
		editor.updateInstanceState({
			screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0, w: 1000, h: 1000 },
		})
		editor.setCamera({ x: 100, y: 100, z: 1 })

		expect(editor.viewportPageBounds).toMatchObject({
			x: -100,
			y: -100,
			w: 1000,
			h: 1000,
			maxX: 900,
			maxY: 900,
		})
	})

	it('sets the page bounds when camera is panned and zoomed', () => {
		editor.updateInstanceState({
			screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0, w: 1000, h: 1000 },
		})
		editor.setCamera({ x: 100, y: 100, z: 2 })

		expect(editor.viewportPageBounds).toMatchObject({
			x: -100,
			y: -100,
			w: 500,
			h: 500,
			maxX: 400,
			maxY: 400,
		})
	})

	it('sets the page bounds when viewport is offset', () => {
		editor.updateInstanceState({
			screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100, w: 1000, h: 1000 },
		})
		editor.setCamera({ x: 0, y: 0, z: 2 })

		// changing the screen bounds should not affect the page bounds
		expect(editor.viewportPageBounds).toMatchObject({
			x: -0,
			y: -0,
			w: 500,
			h: 500,
			maxX: 500,
			maxY: 500,
		})
	})
})
