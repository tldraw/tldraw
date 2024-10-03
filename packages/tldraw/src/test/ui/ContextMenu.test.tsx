import { fireEvent, screen } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { DefaultContextMenu } from '../../lib/ui/components/ContextMenu/DefaultContextMenu'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

it('opens on right-click', async () => {
	await renderTldrawComponent(
		<Tldraw
			onMount={(editor) => {
				editor.createShape({ id: createShapeId(), type: 'geo' })
			}}
		/>,
		{ waitForPatterns: false }
	)
	const canvas = await screen.findByTestId('canvas')

	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')
	await screen.findByTestId('context-menu.select-all')

	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('context-menu')).toBeNull()
})

it('tunnels context menu', async () => {
	const components: TLComponents = {
		ContextMenu: (props) => {
			return (
				<DefaultContextMenu {...props}>
					<button data-testid="abc123">Hello</button>
				</DefaultContextMenu>
			)
		},
	}
	await renderTldrawComponent(
		<Tldraw
			onMount={(editor) => {
				editor.createShape({ id: createShapeId(), type: 'geo' })
			}}
			components={components}
		/>,
		{ waitForPatterns: false }
	)

	const canvas = await screen.findByTestId('canvas')

	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')
	const elm = await screen.findByTestId('abc123')
	expect(elm).toBeDefined()
})
