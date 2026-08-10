import { EditorPortal } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

/**
 * The reason `EditorPortal` exists rather than `createPortal(children, useContainer())`: a portal
 * takes its DOM position from the commit that mounts it, so portaling into the container from a
 * canvas slot lands the node ahead of the UI — and ahead of the skip link, which is only a keyboard
 * route to the canvas while nothing precedes it.
 */
describe('EditorPortal in a full editor', () => {
	it('renders after the UI and its skip link', async () => {
		const rendered = await renderTldrawComponent(
			<Tldraw
				components={{
					InFrontOfTheCanvas: () => (
						<EditorPortal>
							<button data-testid="portaled-button">A pin, say</button>
						</EditorPortal>
					),
				}}
			/>,
			{ waitForPatterns: false }
		)

		const portaled = await rendered.findByTestId('portaled-button')
		const skipLink = document.querySelector('.tl-skip-to-main-content')!
		const ui = document.querySelector('.tlui-layout')!

		expect(
			skipLink.compareDocumentPosition(portaled) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy()
		expect(ui.compareDocumentPosition(portaled) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})
})
