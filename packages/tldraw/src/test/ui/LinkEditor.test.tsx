import { act, fireEvent } from '@testing-library/react'
import { Editor as TextEditor } from '@tiptap/core'
import { Tldraw } from '../../lib/Tldraw'
import { LinkEditor } from '../../lib/ui/components/Toolbar/LinkEditor'
import { tipTapDefaultExtensions } from '../../lib/utils/text/richText'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

let textEditor: TextEditor

afterEach(() => {
	textEditor?.destroy()
})

// The real toolbar only mounts while editing a shape with a non-collapsed selection, which jsdom
// can't lay out, so the link editor is rendered directly against a standalone TipTap editor.
async function renderLinkEditor() {
	textEditor = new TextEditor({
		element: document.createElement('div'),
		extensions: tipTapDefaultExtensions,
		enableCoreExtensions: { textDirection: false },
		content: 'hello',
	})
	textEditor.commands.selectAll()
	const onClose = vi.fn()

	await renderTldrawComponent(
		<Tldraw
			components={{
				TopPanel: () => <LinkEditor textEditor={textEditor} value="" onClose={onClose} />,
			}}
		/>,
		{ waitForPatterns: false }
	)

	const input = document.querySelector('[data-testid="rich-text.link-input"]') as HTMLInputElement
	return {
		onClose,
		type: (value: string) => act(() => fireEvent.change(input, { target: { value } })),
		pressEnter: () => act(() => fireEvent.keyDown(input, { key: 'Enter' })),
		isMarkedInvalid: () => input.classList.contains('tlui-rich-text__toolbar-link-input--invalid'),
		getHref: () => {
			textEditor.commands.selectAll()
			return textEditor.getAttributes('link').href
		},
	}
}

it.each([
	['mailto:hello@tldraw.com', 'mailto:hello@tldraw.com'],
	['codex://threads/abc-123', 'codex://threads/abc-123'],
	['example.com', 'https://example.com'],
])('links %j as %j', async (input, expected) => {
	const linkEditor = await renderLinkEditor()
	linkEditor.type(input)
	linkEditor.pressEnter()
	expect(linkEditor.getHref()).toBe(expected)
	expect(linkEditor.onClose).toHaveBeenCalled()
})

it('marks an invalid url only once enter is pressed, and stays open without linking', async () => {
	const linkEditor = await renderLinkEditor()
	linkEditor.type('hello')
	expect(linkEditor.isMarkedInvalid()).toBe(false)

	linkEditor.pressEnter()
	expect(linkEditor.isMarkedInvalid()).toBe(true)
	expect(linkEditor.getHref()).toBeUndefined()
	expect(linkEditor.onClose).not.toHaveBeenCalled()

	linkEditor.type('hello.com')
	expect(linkEditor.isMarkedInvalid()).toBe(false)
})
