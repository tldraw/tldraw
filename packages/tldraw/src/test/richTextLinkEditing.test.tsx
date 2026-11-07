import { act, renderHook } from '@testing-library/react'
import { Editor as TextEditor } from '@tiptap/core'
import { useEditingLinkBehavior } from '../lib/ui/components/Toolbar/DefaultRichTextToolbar'
import { tipTapDefaultExtensions } from '../lib/utils/text/richText'

function createListWithTrailingLink() {
	return new TextEditor({
		element: document.createElement('div'),
		extensions: tipTapDefaultExtensions,
		enableCoreExtensions: { textDirection: false },
		content: {
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
						},
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{
											type: 'text',
											text: 'some link',
											marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
										},
									],
								},
							],
						},
					],
				},
			],
		},
	})
}

function linkEnd(textEditor: TextEditor) {
	let end = 0
	textEditor.state.doc.descendants((node, pos) => {
		if (node.isText && node.marks.some((m) => m.type.name === 'link')) end = pos + node.nodeSize
	})
	return end
}

it('does not open the link editor when clicking past the end of a line that ends in a link', () => {
	const textEditor = createListWithTrailingLink()
	const { result } = renderHook(() => useEditingLinkBehavior(textEditor))

	// Clicking to the right of the text lands the caret at the link's trailing edge, where the
	// inclusive link mark is still active, but the click target is the list item, not the link.
	const caret = linkEnd(textEditor)
	act(() => {
		textEditor.commands.setTextSelection(caret)
		textEditor.view.dom
			.querySelectorAll('li')[1]
			.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})

	expect(textEditor.isActive('link')).toBe(true)
	expect(result.current.isEditingLink).toBe(false)
	expect(textEditor.state.selection.from).toBe(caret)
	expect(textEditor.state.selection.to).toBe(caret)

	textEditor.destroy()
})

it('opens the link editor and selects the link when clicking on the link itself', () => {
	const textEditor = createListWithTrailingLink()
	const { result } = renderHook(() => useEditingLinkBehavior(textEditor))

	const end = linkEnd(textEditor)
	act(() => {
		textEditor.commands.setTextSelection(end - 2)
		textEditor.view.dom
			.querySelector('a')!
			.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})

	expect(result.current.isEditingLink).toBe(true)
	expect(textEditor.state.selection.to).toBe(end)
	expect(textEditor.state.selection.from).toBe(end - 'some link'.length)

	// Closing the editor leaves a collapsed caret instead of re-selecting the whole link.
	act(() => result.current.onEditLinkClose())
	expect(result.current.isEditingLink).toBe(false)
	expect(textEditor.state.selection.empty).toBe(true)

	textEditor.destroy()
})

it('opens the link editor on the first click even while an earlier range selection is still in place', () => {
	const textEditor = createListWithTrailingLink()
	const { result } = renderHook(() => useEditingLinkBehavior(textEditor))

	// Entering edit mode selects all the text. Clicking inside that selection only moves
	// ProseMirror's selection on a later selectionchange, so the click still sees select-all.
	const end = linkEnd(textEditor)
	act(() => {
		textEditor.commands.selectAll()
		textEditor.view.dom
			.querySelector('a')!
			.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})

	expect(result.current.isEditingLink).toBe(true)
	expect([textEditor.state.selection.from, textEditor.state.selection.to]).toEqual([
		end - 'some link'.length,
		end,
	])

	textEditor.destroy()
})
