import { createTLStore } from '../..'
import { Editor } from '../editor/Editor'
import { tleditors } from './editors'

function createTestEditor() {
	return new Editor({
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
		getContainer: () => document.body,
	})
}

afterEach(() => {
	for (const editor of [...tleditors.getMounted()]) {
		editor.emit('unmount')
	}
})

describe('tleditors', () => {
	it('tracks editors as they mount and unmount', () => {
		const editor = createTestEditor()
		expect(tleditors.getMounted()).toEqual([])

		editor.emit('mount')
		expect(tleditors.getMounted()).toEqual([editor])

		editor.emit('unmount')
		expect(tleditors.getMounted()).toEqual([])
	})

	it('does not add the same editor twice', () => {
		const editor = createTestEditor()
		editor.emit('mount')
		editor.emit('mount')
		expect(tleditors.getMounted()).toEqual([editor])
	})

	it('removes an editor when it is disposed while mounted', () => {
		const editor = createTestEditor()
		editor.emit('mount')
		expect(tleditors.getMounted()).toEqual([editor])

		editor.dispose()
		expect(tleditors.getMounted()).toEqual([])
		expect(editor.getIsMounted()).toBe(false)
	})

	it('tracks multiple mounted editors', () => {
		const editorA = createTestEditor()
		const editorB = createTestEditor()

		editorA.emit('mount')
		editorB.emit('mount')
		expect(tleditors.getMounted()).toEqual([editorA, editorB])

		editorA.emit('unmount')
		expect(tleditors.getMounted()).toEqual([editorB])
	})
})
