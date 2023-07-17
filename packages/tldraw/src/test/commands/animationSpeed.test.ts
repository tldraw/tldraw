import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

jest.useFakeTimers()

it('zooms in gradually when duration is present and animtion speed is default', () => {
	expect(editor.zoomLevel).toBe(1)
	editor.animationSpeed = 1 // default
	editor.zoomIn(undefined, { duration: 100 })
	editor.emit('tick', 25) // <-- quarter way
	expect(editor.zoomLevel).not.toBe(2)
	editor.emit('tick', 25) // 50 <-- half way
	expect(editor.zoomLevel).not.toBe(2)
	editor.emit('tick', 50) // 50 <-- done!
	expect(editor.zoomLevel).toBe(2)
})

it('zooms in gradually when duration is present and animtion speed is off', () => {
	expect(editor.zoomLevel).toBe(1)
	editor.animationSpeed = 0 // none
	editor.zoomIn(undefined, { duration: 100 })
	expect(editor.zoomLevel).toBe(2) // <-- Should skip!
})

it('zooms in gradually when duration is present and animtion speed is double', () => {
	expect(editor.zoomLevel).toBe(1)
	editor.animationSpeed = 2 // default
	editor.zoomIn(undefined, { duration: 100 })
	editor.emit('tick', 25) // <-- half way
	expect(editor.zoomLevel).not.toBe(2)
	editor.emit('tick', 25) // 50 <-- should finish
	expect(editor.zoomLevel).toBe(2)
})
