import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor
})

describe('When following a user', () => {
	it.todo('starts following a user')
	it.todo('stops following a user')
	it.todo('stops following a user when the camera changes due to user action')
	it.todo('moves the camera to follow the user without unfollowing them')
	it.todo('stops any animations while following')
	it.todo('stops following a user when the page changes due to user action')
	it.todo('follows a user to another page without unfollowing them')
})
