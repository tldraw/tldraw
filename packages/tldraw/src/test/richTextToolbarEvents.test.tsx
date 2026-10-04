import { act } from '@testing-library/react'
import { Editor as TextEditor } from '@tiptap/core'
import { Tldraw } from '../lib/Tldraw'
import { TldrawUiToolbar } from '../lib/ui/components/primitives/TldrawUiToolbar'
import { DefaultRichTextToolbarContent } from '../lib/ui/components/Toolbar/DefaultRichTextToolbarContent'
import { tipTapDefaultExtensions } from '../lib/utils/text/richText'
import { renderTldrawComponent } from './testutils/renderTldrawComponent'

// The real toolbar only mounts while editing a shape with a non-collapsed selection, which jsdom
// can't lay out, so the content is rendered directly against a standalone TipTap editor.
it('reports each rich text toolbar button as its own operation', async () => {
	const textEditor = new TextEditor({
		element: document.createElement('div'),
		extensions: tipTapDefaultExtensions,
		enableCoreExtensions: { textDirection: false },
		content: 'hello',
	})
	const onUiEvent = vi.fn()

	await renderTldrawComponent(
		<Tldraw
			onUiEvent={onUiEvent}
			components={{
				TopPanel: () => (
					<TldrawUiToolbar label="Rich text">
						<DefaultRichTextToolbarContent textEditor={textEditor} />
					</TldrawUiToolbar>
				),
			}}
		/>,
		{ waitForPatterns: false }
	)

	const operations = ['bold', 'italic', 'code', 'bulletList', 'highlight']
	for (const operation of operations) {
		const button = document.querySelector(`[data-testid="rich-text.${operation}"]`) as HTMLElement
		await act(async () => button.click())
	}

	const reported = onUiEvent.mock.calls
		.filter(([name]) => name === 'rich-text')
		.map(([, data]) => data.operation)
	expect(reported).toEqual(operations)

	textEditor.destroy()
})
