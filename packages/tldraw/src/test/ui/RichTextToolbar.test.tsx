import { act, waitFor } from '@testing-library/react'
import { createShapeId, Editor, TiptapEditor, toRichText } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const LINK_INPUT = '.tlui-rich-text__toolbar input'

// ProseMirror measures the caret with getClientRects when the selection moves; jsdom has no layout.
const emptyRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
beforeAll(() => {
	for (const proto of [Text.prototype, Range.prototype, Element.prototype] as any[]) {
		proto.getClientRects = () => [emptyRect()]
		proto.getBoundingClientRect = emptyRect
	}
})

async function setup({ withLink }: { withLink: boolean }) {
	const id = createShapeId('text')
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	await act(async () => {
		editor.createShape({
			id,
			type: 'text',
			x: 0,
			y: 0,
			props: {
				richText: withLink
					? {
							type: 'doc',
							content: [
								{
									type: 'paragraph',
									content: [
										{
											type: 'text',
											text: 'hello',
											marks: [{ type: 'link', attrs: { href: 'https://tldraw.com' } }],
										},
									],
								},
							],
						}
					: toRichText('hello'),
			},
		})
		editor.select(id)
		editor.setEditingShape(id)
	})

	let textEditor: TiptapEditor | null = null
	await waitFor(() => {
		textEditor = editor.getRichTextEditor()
		expect(textEditor).toBeTruthy()
	})
	// Put the caret inside the text so `isActive('link')` reflects the link mark (if any)
	await act(async () => {
		textEditor!.commands.setTextSelection(2)
	})

	return { editor, rendered, textEditor: textEditor! }
}

function pressLinkShortcut(editor: Editor) {
	act(() => {
		editor
			.getContainerDocument()
			.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'k', metaKey: true, shiftKey: true, bubbles: true })
			)
	})
}

describe('rich text toolbar link shortcut', () => {
	it('opens the link editor on a fine pointer', async () => {
		const { editor, rendered } = await setup({ withLink: false })
		act(() => editor.updateInstanceState({ isCoarsePointer: false }))

		pressLinkShortcut(editor)

		await waitFor(() => {
			expect(rendered.container.querySelector(LINK_INPUT)).not.toBeNull()
		})
	})

	it('does not open the link editor on a coarse pointer when there is no link to anchor to', async () => {
		const { editor, rendered } = await setup({ withLink: false })
		act(() => editor.updateInstanceState({ isCoarsePointer: true }))

		pressLinkShortcut(editor)

		// The formatting toolbar is hidden on touch, so a link editor with nothing to anchor to
		// would stay off-screen while its input captured typing.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 20))
		})
		expect(rendered.container.querySelector(LINK_INPUT)).toBeNull()
	})

	it('opens the link editor on a coarse pointer when the caret is inside a link', async () => {
		const { editor, rendered } = await setup({ withLink: true })
		act(() => editor.updateInstanceState({ isCoarsePointer: true }))

		pressLinkShortcut(editor)

		await waitFor(() => {
			expect(rendered.container.querySelector(LINK_INPUT)).not.toBeNull()
		})
	})
})
