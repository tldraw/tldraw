import { act, fireEvent, screen } from '@testing-library/react'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// Kept apart from menuGating.test.tsx, which stubs the clipboard API before the menu modules load.
it('hides Paste in the main menu when the browser cannot read the clipboard', async () => {
	expect(navigator.clipboard?.read).toBeUndefined()
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)
	act(() => editor.menus.addOpenMenu('main menu'))
	const trigger = await screen.findByTestId('main-menu-sub.edit-button')
	act(() => trigger.focus())
	fireEvent.keyDown(trigger, { key: 'ArrowRight' })
	await screen.findByTestId('main-menu.copy')
	expect(screen.queryByTestId('main-menu.paste')).toBeNull()
})
