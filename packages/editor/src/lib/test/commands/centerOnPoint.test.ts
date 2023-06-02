import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

it('centers on the point', () => {
	app.centerOnPoint(400, 400)
	expect(app.viewportPageCenter).toMatchObject({ x: 400, y: 400 })
})
