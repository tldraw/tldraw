import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

jest.useFakeTimers()

it('zooms in gradually when duration is present and animtion speed is default', () => {
	expect(editor.camera.getZoom()).toBe(1)
	editor.user.updateUserPreferences({ animationSpeed: 1 }) // default
	editor.camera.zoomIn(undefined, { duration: 100 })
	editor.emit('tick', 25) // <-- quarter way
	expect(editor.camera.getZoom()).not.toBe(2)
	editor.emit('tick', 25) // 50 <-- half way
	expect(editor.camera.getZoom()).not.toBe(2)
	editor.emit('tick', 50) // 50 <-- done!
	expect(editor.camera.getZoom()).toBe(2)
})

it('zooms in gradually when duration is present and animtion speed is off', () => {
	expect(editor.camera.getZoom()).toBe(1)
	editor.user.updateUserPreferences({ animationSpeed: 0 }) // none
	editor.camera.zoomIn(undefined, { duration: 100 })
	expect(editor.camera.getZoom()).toBe(2) // <-- Should skip!
})

it('zooms in gradually when duration is present and animtion speed is double', () => {
	expect(editor.camera.getZoom()).toBe(1)
	editor.user.updateUserPreferences({ animationSpeed: 2 }) // default
	editor.camera.zoomIn(undefined, { duration: 100 })
	editor.emit('tick', 25) // <-- half way
	expect(editor.camera.getZoom()).not.toBe(2)
	editor.emit('tick', 25) // 50 <-- should finish
	expect(editor.camera.getZoom()).toBe(2)
})
