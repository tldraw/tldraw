import { act, render, screen } from '@testing-library/react'
import { EditorPortal } from '../components/EditorPortal'
import { createTLStore } from '../config/createTLStore'
import { TL_CONTAINER_CLASS, TldrawEditor } from '../TldrawEditor'

/** Mounted in a canvas slot — the deep-in-the-tree case the portal exists for. */
function Portaled() {
	return (
		<EditorPortal>
			<div data-testid="portaled" />
		</EditorPortal>
	)
}

describe('EditorPortal', () => {
	async function renderEditor() {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} components={{ InFrontOfTheCanvas: Portaled }} />)
		})
		return document.querySelector(`.${TL_CONTAINER_CLASS}`)!
	}

	it('renders its children into the editor container', async () => {
		const container = await renderEditor()
		expect(container.contains(screen.getByTestId('portaled'))).toBe(true)
	})

	it('renders into a host that comes after everything the editor renders', async () => {
		const container = await renderEditor()
		const host = container.querySelector('.tl-portal-host')!
		expect(host.contains(screen.getByTestId('portaled'))).toBe(true)
		// Last of the container's rendered children. Managers append their own nodes after this one
		// (the text measurement element, say) but those are `tabIndex = -1` and out of the tab order.
		const rendered = [...container.children].filter((el) => !el.matches('.tl-text-measure'))
		expect(rendered.at(-1)).toBe(host)
	})

	// The tab order guarantee: mounted in a canvas slot, the portaled content still lands after
	// everything the editor renders itself — including (in tldraw) the UI's skip link, which only
	// works while nothing precedes it. Portaling straight into the container lands it ahead of them.
	it('places its children after the rest of the editor in document order', async () => {
		await renderEditor()
		const portaled = screen.getByTestId('portaled')
		const canvas = screen.getByTestId('canvas')
		expect(canvas.compareDocumentPosition(portaled) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})
})
