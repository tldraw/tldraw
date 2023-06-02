import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('centers on the point', () => {
	app.centerOnPoint(400, 400)
	expect(app.viewportPageCenter).toMatchObject({ x: 400, y: 400 })
})
