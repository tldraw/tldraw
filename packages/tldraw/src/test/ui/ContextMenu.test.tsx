import { fireEvent, screen } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { DefaultContextMenu } from '../../lib/ui/components/menus/ContextMenu/DefaultContextMenu'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

it('opens on right-click', async () => {
	await renderTldrawComponent(
		<Tldraw
			onMount={(editor) => {
				editor.createShape({ id: createShapeId(), type: 'geo' })
			}}
		/>
	)
	const canvas = await screen.findByTestId('canvas')

	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')
	await screen.findByTestId('menu-item.select-all')

	fireEvent.keyDown(canvas, { key: 'Escape' })
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
		/>
	)

	const canvas = await screen.findByTestId('canvas')

	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')
	const elm = await screen.findByTestId('abc123')
	expect(elm).toBeDefined()
})

// The tunneling / overriding should address this

// it.failing('updates overrides reactively', async () => {
// 	const count = atom('count', 1)
// 	const overrides: TLUiOverrides = {
// 		contextMenu: (editor, schema) => {
// 			if (count.get() === 0) return schema
// 			return [
// 				...schema,
// 				{
// 					type: 'item',
// 					id: 'tester',
// 					disabled: false,
// 					readonlyOk: true,
// 					checked: false,
// 					actionItem: {
// 						id: 'tester',
// 						readonlyOk: true,
// 						onSelect: noop,
// 						label: `Count: ${count.get()}`,
// 					},
// 				},
// 			]
// 		},
// 	}
// 	const { editor } = await renderTldrawComponentWithEditor((onMount) => (
// 		<Tldraw onMount={onMount} overrides={overrides} />
// 	))

// 	await act(() => editor.createShape({ id: createShapeId(), type: 'geo' }).selectAll())

// 	// open the context menu:
// 	fireEvent.contextMenu(await screen.findByTestId('canvas'))

// 	// check that the context menu item was added:
// 	await screen.findByTestId('menu-item.tester')

// 	// It should disappear when count is 0:
// 	await act(() => count.set(0))
// 	expect(screen.queryByTestId('menu-item.tester')).toBeNull()

// 	// It should update its label when it changes:
// 	await act(() => count.set(1))
// 	const item = await screen.findByTestId('menu-item.tester')
// 	expect(item.textContent).toBe('Count: 1')
// 	await act(() => count.set(2))
// 	expect(item.textContent).toBe('Count: 2')
// })
