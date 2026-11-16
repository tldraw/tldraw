import { act } from '@testing-library/react'
import { atom, useValue } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { DefaultToolbar } from '../lib/ui/components/Toolbar/DefaultToolbar'
import { DefaultToolbarContent } from '../lib/ui/components/Toolbar/DefaultToolbarContent'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

const pressed = atom('split pressed', false)

// A two-part control, such as a split button: one toolbar item whose first button holds its state.
function SplitControl() {
	const isPressed = useValue('pressed', () => pressed.get(), [])
	return (
		<div role="group" aria-label="Split" data-value="split" data-testid="split">
			<button type="button" aria-pressed={isPressed}>
				Main
			</button>
			<button type="button">More</button>
		</div>
	)
}

it('shows a grouped control from the overflow in the toolbar while its first button is pressed', async () => {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				components={{
					Toolbar: () => (
						<DefaultToolbar>
							<DefaultToolbarContent />
							<SplitControl />
						</DefaultToolbar>
					),
				}}
			/>
		),
		{ waitForPatterns: false }
	)
	const split = document.querySelector('.tlui-main-toolbar__tools [data-testid="split"]')!
	// jsdom has no layout, so the toolbar shows its fewest items and the control starts in the overflow.
	expect(split.getAttribute('data-toolbar-visible')).toBe('false')

	await act(async () => {
		pressed.set(true)
	})
	expect(split.getAttribute('data-toolbar-visible')).toBe('true')
	editor.dispose()
})
