import { act, render } from '@testing-library/react'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { TldrawEditor } from '../TldrawEditor'

// The `tldraw_preserve_focus` search param switches the editor into preserve-focus mode, where
// a pointerdown inside the container focuses the editor and a pointerdown elsewhere blurs it.
describe('preserve-focus mode', () => {
	const mounted: Element[] = []

	beforeEach(() => {
		window.history.replaceState(null, '', '?tldraw_preserve_focus')
	})

	afterEach(() => {
		window.history.replaceState(null, '', '/')
		for (const el of mounted.splice(0)) el.remove()
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
		mounted.push(container)
		let editor: Editor | undefined
		let unmount = () => {}
		await act(async () => {
			unmount = render(
				<TldrawEditor
					store={store}
					onMount={(e) => {
						editor = e
					}}
				/>,
				{ container }
			).unmount
		})
		return { editor: editor!, unmount }
	}

	it('focuses on a canvas pointerdown and blurs on a pointerdown outside', async () => {
		const { editor } = await mount(document.body)
		expect(editor.getIsFocused()).toBe(false)

		pointerDown(editor.getContainer().querySelector('.tl-canvas')!)
		expect(editor.getIsFocused()).toBe(true)

		pointerDown(document.body)
		expect(editor.getIsFocused()).toBe(false)
	})

	it('keeps focus when the editor is inside an open shadow root', async () => {
		// The body listener sees the event retargeted to the shadow host, so a check on
		// `e.target` alone would blur the editor right after the container focused it.
		const host = document.createElement('div')
		document.body.appendChild(host)
		mounted.push(host)
		const { editor } = await mount(host.attachShadow({ mode: 'open' }))

		pointerDown(editor.getContainer().querySelector('.tl-canvas')!)
		expect(editor.getIsFocused()).toBe(true)

		pointerDown(document.body)
		expect(editor.getIsFocused()).toBe(false)
	})

	it('removes the body listener on unmount', async () => {
		const { editor, unmount } = await mount(document.body)
		const blur = vi.spyOn(editor, 'blur')

		act(() => unmount())
		pointerDown(document.body)
		expect(blur).not.toHaveBeenCalled()
	})
})
