import { act, waitFor } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { renderTldrawComponentWithEditor } from '../../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../../Tldraw'

const id = createShapeId('text')

// ProseMirror scrolls the selection into view after a selection change, which needs layout that
// jsdom does not provide for ranges.
beforeAll(() => {
	Range.prototype.getClientRects = () => [] as unknown as DOMRectList
	Range.prototype.getBoundingClientRect = () => new DOMRect()
})

const richText = {
	type: 'doc',
	content: [
		{ type: 'paragraph', content: [{ type: 'text', text: 'Shopping' }] },
		{
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'eggs' }] }],
				},
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'milk' }] }],
				},
			],
		},
	],
}

async function startEditing(editor: Editor) {
	await act(async () => {
		editor.createShape({ id, type: 'text', x: 0, y: 0, props: { richText } })
		editor.select(id)
		editor.setEditingShape(id)
	})
	await waitFor(() => expect(editor.getRichTextEditor()).toBeTruthy())
	return editor.getRichTextEditor()!
}

// What ProseMirror puts in the `text/plain` clipboard entry for the current selection.
function copyPlaintext(textEditor: ReturnType<Editor['getRichTextEditor']>) {
	const { view } = textEditor!
	return view.someProp('clipboardTextSerializer', (f) => f(view.state.selection.content(), view))
}

describe('RichTextArea clipboard', () => {
	it('copies a selected list with markers and no blank lines', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{ waitForPatterns: false }
		)
		const textEditor = await startEditing(editor)

		act(() => {
			textEditor.commands.selectAll()
		})
		expect(copyPlaintext(textEditor)).toBe('Shopping\n- eggs\n- milk')
	})

	it('copies a partial selection cut to the selected text', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{ waitForPatterns: false }
		)
		const textEditor = await startEditing(editor)

		// From `ping` in the paragraph to `mi` in the second item.
		act(() => {
			textEditor.commands.setTextSelection({ from: 5, to: 23 })
		})
		expect(copyPlaintext(textEditor)).toBe('ping\n- eggs\n- mi')

		act(() => {
			textEditor.commands.setTextSelection({ from: 21, to: 25 })
		})
		expect(copyPlaintext(textEditor)).toBe('milk')
	})
})
