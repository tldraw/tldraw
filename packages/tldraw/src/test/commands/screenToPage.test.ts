import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('viewport.screenToPage', () => {
	it('converts correctly', () => {
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })

		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: -100, y: -100 })
	})

	it('converts correctly when zoomed', () => {
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 100, y: 100 })

		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: -100, y: -100 })
	})

	it('converts correctly when panned', () => {
		editor.setCamera({ x: 100, y: 100 })

		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })

		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: -100, y: -100 })
	})

	it('converts correctly when panned and zoomed', () => {
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })

		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -400, y: -400 })
		expect(editor.pageToScreen({ x: -400, y: -400 })).toMatchObject({ x: -100, y: -100 })
	})

	it('converts correctly when offset', () => {
		// move the editor's page bounds down and to the left by 100, 100
		// 0,0 s
		//  +------------------------+
		//  | 100,100 s              |
		//  |   c-----------------+  |
		//  |   | 0,0 p           |  |
		//  |   |                 |  |

		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })

		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: -100, y: -100 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })

		// 0,0 s
		//  c------------------------+
		//  | 100,100 s              |
		//  |   +-----------------+  |
		//  |   | 100,100 p       |  |
		//  |   |                 |  |

		editor.setCamera({ x: -100, y: -100 }) // -100, -100
		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })

		// 0,0 s    no offset, zoom at 50%
		//  c------------------------+
		//  | 0,0 p                  |
		//  |                        |
		//  |                        |
		//  |                        |
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 100, y: 100 })
	})

	it('converts correctly when zoomed out', () => {
		// camera at zero, screenbounds at zero, but zoom at .5
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.pageToScreen({ x: -200, y: -200 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 100, y: 100 })
	})

	it('converts correctly when zoomed in', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: -100, y: -100 })).toMatchObject({ x: -50, y: -50 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 50, y: 50 })
	})

	it('converts correctly when zoomed', () => {
		// camera at zero, screenbounds at zero, but zoom at .5
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		// zero point, where page and screen are the same
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 50, y: 50 })
		expect(editor.screenToPage({ x: 50, y: 50 })).toMatchObject({ x: 100, y: 100 })

		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })
	})

	it('converts correctly when zoomed and panned', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })

		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 150, y: 150 })
		expect(editor.screenToPage({ x: 150, y: 150 })).toMatchObject({ x: 100, y: 100 })

		// zero point, where page and screen are the same
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.screenToPage({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })
	})

	it('converts correctly when offset', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })
		editor.setCamera({ x: 0, y: 0, z: 0.5 })

		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 150, y: 150 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })

		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: -200, y: -200 })
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.screenToPage({ x: 300, y: 300 })).toMatchObject({ x: 400, y: 400 })
	})

	it('converts correctly when panned', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 1 })

		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 300, y: 300 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 200, y: 200 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.screenToPage({ x: 300, y: 300 })).toMatchObject({ x: 200, y: 200 })
	})

	it('converts correctly when panned and zoomed', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 0, y: 0 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 150, y: 150 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })

		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 150, y: 150 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.screenToPage({ x: 200, y: 200 })).toMatchObject({ x: 200, y: 200 })
	})

	it('converts correctly when panned and zoomed and offset', () => {
		editor.updateInstanceState({ screenBounds: { ...editor.viewportScreenBounds, x: 100, y: 100 } })
		editor.setCamera({ x: 100, y: 100, z: 0.5 })

		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 200, y: 200 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 250, y: 250 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({ x: 300, y: 300 })

		expect(editor.screenToPage({ x: 200, y: 200 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage({ x: 250, y: 250 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.screenToPage({ x: 300, y: 300 })).toMatchObject({ x: 200, y: 200 })
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
