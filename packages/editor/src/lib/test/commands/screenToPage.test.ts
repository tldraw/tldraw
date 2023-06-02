import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

describe('viewport.screenToPage', () => {
	it('converts correctly', () => {
		expect(app.screenToPage(0, 0)).toMatchObject({ x: 0, y: 0 })
		expect(app.screenToPage(200, 200)).toMatchObject({
			x: 200,
			y: 200,
		})
		app.setCamera(100, 100)
		expect(app.screenToPage(200, 200)).toMatchObject({
			x: 100,
			y: 100,
		})
	})
})
