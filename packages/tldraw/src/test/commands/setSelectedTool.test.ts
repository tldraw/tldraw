import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('Set selected tool', () => {
	it('Selects a tool by its name', () => {
		editor.setCurrentTool('hand')
		editor.expectPathToBe('root.hand.idle')
	})

	it('Selects a tool by its deep path', () => {
		editor.setCurrentTool('hand.pointing')
		editor.expectPathToBe('root.hand.pointing')
	})
})
