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
async function submitLink(value: string) {
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
	act(() => {
		fireEvent.change(input, { target: { value } })
		fireEvent.keyDown(input, { key: 'Enter' })
	})

	textEditor.commands.selectAll()
	return {
		href: textEditor.getAttributes('link').href,
		onClose,
		isMarkedInvalid: input.classList.contains('tlui-rich-text__toolbar-link-input--invalid'),
	}
}

it.each([
	['mailto:hello@tldraw.com', 'mailto:hello@tldraw.com'],
	['codex://threads/abc-123', 'codex://threads/abc-123'],
	['example.com', 'https://example.com'],
])('links %j as %j', async (input, expected) => {
	const { href, onClose, isMarkedInvalid } = await submitLink(input)
	expect(href).toBe(expected)
	expect(onClose).toHaveBeenCalled()
	expect(isMarkedInvalid).toBe(false)
})

it('stays open, marked invalid, without linking when enter is pressed on an invalid url', async () => {
	const { href, onClose, isMarkedInvalid } = await submitLink('hello')
	expect(href).toBeUndefined()
	expect(onClose).not.toHaveBeenCalled()
	expect(isMarkedInvalid).toBe(true)
})
