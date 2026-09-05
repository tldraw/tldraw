import { act, render } from '@testing-library/react'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { TldrawEditor } from '../TldrawEditor'

// The `tldraw_preserve_focus` search param switches the editor into preserve-focus mode, where
// a pointerdown inside the container focuses the editor and a pointerdown elsewhere blurs it.
describe('preserve-focus mode', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '?tldraw_preserve_focus')
	})

	afterEach(() => {
		window.history.replaceState(null, '', '/')
	})

	function pointerDown(target: EventTarget) {
		act(() => {
			target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
		})
	}

	async function mount(root: Element | ShadowRoot) {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const container = document.createElement('div')
		root.appendChild(container)
		let editor: Editor | undefined
		await act(async () => {
			render(
				<TldrawEditor
					store={store}
					onMount={(e) => {
						editor = e
					}}
				/>,
				{ container }
			)
		})
		return editor!
	}

	it('focuses on a canvas pointerdown and blurs on a pointerdown outside', async () => {
		const editor = await mount(document.body)
		expect(editor.getIsFocused()).toBe(false)

		pointerDown(editor.getContainer().querySelector('.tl-canvas')!)
		expect(editor.getIsFocused()).toBe(true)

		pointerDown(document.body)
		expect(editor.getIsFocused()).toBe(false)
	})

	it('keeps focus when the editor is inside a shadow root', async () => {
		// The body listener sees the event retargeted to the shadow host, so a check on
		// `e.target` alone would blur the editor right after the container focused it.
		const host = document.createElement('div')
		document.body.appendChild(host)
		const editor = await mount(host.attachShadow({ mode: 'open' }))

		pointerDown(editor.getContainer().querySelector('.tl-canvas')!)
		expect(editor.getIsFocused()).toBe(true)

		pointerDown(document.body)
		expect(editor.getIsFocused()).toBe(false)
	})
})
