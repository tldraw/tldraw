import { toRichText } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

// This is copied from the "select" tool in the tools context
// It's a bit of a hack to simulate the user clicking the select tool
// Since there's no way of importing this code, it's copied here.
function onSelectToolClick(editor: TestEditor) {
	const currentNode = editor.root.getCurrent()!
	currentNode.exit({}, currentNode.id)
	currentNode.enter({}, currentNode.id)
	editor.setCurrentTool('select')
}

describe('interaction between the select tool and the editing state', () => {
	it('leaves editing when clicking the select tool', () => {
		editor.setCurrentTool('text')
		editor.pointerDown()
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
		onSelectToolClick(editor)
		editor.expectToBeIn('select.idle')
	})

	it('leaves cropping when clicking the select tool', () => {
		editor
			.createShape({ type: 'image', props: { w: 100, h: 100 } })
			.pointerMove(50, 50)
			.doubleClick()
			.expectToBeIn('select.crop.idle')
		onSelectToolClick(editor)
		editor.expectToBeIn('select.idle')
	})

	it('leaves editing while not tool locked', () => {
		editor
			.updateInstanceState({ isToolLocked: false })
			.setCurrentTool('text')
			.pointerMove(100, 100)
			.pointerDown()
			.pointerUp()
			.expectToBeIn('select.editing_shape')
			.pointerMove(200, 200)
			.pointerDown()
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('returns to the text tool with its own cursor when a tool-locked edit is finished', () => {
		editor
			.updateInstanceState({ isToolLocked: true })
			.setCurrentTool('text')
			.pointerMove(100, 100)
			.pointerDown()
			.pointerUp()
			.expectToBeIn('select.editing_shape')
		const id = editor.getEditingShapeId()!
		editor.updateShape({ id, type: 'text', props: { richText: toRichText('hello') } })

		editor.cancel().expectToBeIn('text.idle')
		expect(editor.getInstanceState().cursor.type).toBe('cross')
		// The select tool's idle must not have been entered underneath the text tool
		expect(editor.getStateDescendant('select.idle')!.getIsActive()).toBe(false)
	})

	it('leaves editing when clicking the select tool while tool locked', () => {
		editor
			.updateInstanceState({ isToolLocked: true })
			.setCurrentTool('text')
			.pointerMove(100, 100)
			.pointerDown()
			.pointerUp()
			.expectToBeIn('select.editing_shape')
			.pointerMove(200, 200)
			.pointerDown()
			.pointerUp()
			.expectToBeIn('select.editing_shape')
		onSelectToolClick(editor)
		editor.expectToBeIn('select.idle')
	})
})
