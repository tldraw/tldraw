import { TLDrawTool } from '../../app/statechart/TLDrawTool/TLDrawTool'
import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})
afterEach(() => {
	app?.dispose()
})

describe(TLDrawTool, () => {
	return
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		app.setSelectedTool('draw')
		app.expectPathToBe('root.draw.idle')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})

	it('Enters the drawing state on pointer down', () => {
		app.setSelectedTool('draw')
		app.pointerDown(50, 50)
		app.expectPathToBe('root.draw.drawing')
	})
})

describe('When in the drawing state', () => {
	it('Returns to idle on cancel', () => {
		app.setSelectedTool('draw')
		app.pointerDown(50, 50)
		app.cancel()
		app.expectPathToBe('root.draw.idle')
	})

	it('Returns to idle on complete', () => {
		app.setSelectedTool('draw')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.draw.idle')

		app.pointerDown(50, 50)
		app.pointerMove(55, 55)
		app.pointerMove(60, 60)
		app.pointerUp(60, 60)
		app.expectPathToBe('root.draw.idle')
	})
})
