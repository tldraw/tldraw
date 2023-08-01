import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('viewport.pageToScreen', () => {
	it('converts correctly', () => {
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({
			x: 200,
			y: 200,
		})
		editor.setCamera({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({
			x: 300,
			y: 300,
		})
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
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 200, y: 200 })

		// 0,0 s
		//  c------------------------+
		//  | 100,100 s              |
		//  |   +-----------------+  |
		//  |   | 100,100 p       |  |
		//  |   |                 |  |

		editor.setCamera({ x: -100, y: -100 }) // -100, -100
		expect(editor.pageToScreen({ x: -100, y: -100 })).toMatchObject({ x: -100, y: -100 })
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })
	})
})
