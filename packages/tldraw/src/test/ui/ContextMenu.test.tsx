import { screen } from '@testing-library/react'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

it('opens on right-click', async () => {
	await renderTldrawComponent(<Tldraw />)
	const canvas = await screen.findByTestId('canvas')

	canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
})
