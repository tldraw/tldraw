import { act, render } from '@testing-library/react'
import { Editor } from '../editor/Editor'
import { TldrawEditor } from '../TldrawEditor'

function dropEvent(dataTransfer: { files: File[]; getData(type: string): string }) {
	const event = new Event('drop', { bubbles: true, cancelable: true })
	Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
	return event
}

describe('useCanvasEvents drop handling', () => {
	let editor: Editor
	let canvas: HTMLElement

	beforeEach(async () => {
		await act(async () => {
			render(
				<TldrawEditor
					shapeUtils={[]}
					bindingUtils={[]}
					onMount={(e) => {
						editor = e
					}}
				/>
			)
		})
		canvas = document.querySelector('[data-testid="canvas"]') as HTMLElement

		// Stand-ins for the default handlers: any undoable change will do.
		editor.registerExternalContentHandler('files', async () => {
			editor.createPage({ name: 'dropped' })
		})
		editor.registerExternalContentHandler('url', async () => {
			editor.createPage({ name: 'dropped' })
		})

		// An unmarked change before the drop, like a stroke the user just drew.
		editor.createPage({ name: 'before drop' })
	})

	afterEach(() => {
		editor?.dispose()
	})

	function pageNames() {
		return editor.getPages().map((p) => p.name)
	}

	it('makes a dropped file its own undo step', async () => {
		await act(async () => {
			canvas.dispatchEvent(
				dropEvent({ files: [new File(['x'], 'x.png', { type: 'image/png' })], getData: () => '' })
			)
		})
		expect(pageNames()).toEqual(['Page 1', 'before drop', 'dropped'])

		editor.undo()

		expect(pageNames()).toEqual(['Page 1', 'before drop'])
	})

	it('makes a dropped url its own undo step', async () => {
		await act(async () => {
			canvas.dispatchEvent(
				dropEvent({ files: [], getData: (type) => (type === 'url' ? 'https://example.com' : '') })
			)
		})
		expect(pageNames()).toEqual(['Page 1', 'before drop', 'dropped'])

		editor.undo()

		expect(pageNames()).toEqual(['Page 1', 'before drop'])
	})
})
