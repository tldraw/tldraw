import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { StateNode } from '../editor/tools/StateNode'

let editor: Editor

class A extends StateNode {
	static override id = 'A'
}

class B extends StateNode {
	static override id = 'B'
}

class C extends StateNode {
	static override id = 'C'

	override onEnter = () => {
		this.currentToolIdMask = 'A'
	}
}

beforeEach(() => {
	editor = new Editor({
		initialState: 'A',
		shapeUtils: [],
		tools: [A, B, C],
		store: createTLStore({ shapeUtils: [] }),
		getContainer: () => document.body,
	})
})

describe('current tool id mask', () => {
	it('starts with the correct tool id', () => {
		expect(editor.currentToolId).toBe('A')
	})

	it('updates the current tool id', () => {
		editor.setCurrentTool('B')
		expect(editor.currentToolId).toBe('B')
	})

	it('masks the current tool id', () => {
		editor.setCurrentTool('C')
		expect(editor.currentToolId).toBe('A')
	})
})
