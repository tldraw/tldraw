import { TestEditor } from './TestEditor'

let editor: TestEditor
beforeEach(() => {
	editor = new TestEditor()
})

describe('restoring bound arrows', () => {
	editor
	it.todo(
		'removes bound arrows on delete, restores them on undo but only when change was done by user'
	)
})
