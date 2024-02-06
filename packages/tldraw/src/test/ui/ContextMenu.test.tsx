import { fireEvent, screen } from '@testing-library/react'
import { createShapeId, noop } from '@tldraw/editor'
import { act } from 'react-dom/test-utils'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiOverrides } from '../../lib/ui/overrides'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../testutils/renderTldrawComponent'

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

it('updates overrides reactively', async () => {
	const overrides: TLUiOverrides = {
		contextMenu: (editor, schema) => {
			const items = editor.getSelectedShapeIds().length
			if (items === 0) return schema
			return [
				...schema,
				{
					type: 'item',
					id: 'tester',
					disabled: false,
					readonlyOk: true,
					checked: false,
					actionItem: {
						id: 'tester',
						readonlyOk: true,
						onSelect: noop,
						label: `Selected: ${items}`,
					},
				},
			]
		},
	}
	const { editor } = await renderTldrawComponentWithEditor((onMount) => (
		<Tldraw onMount={onMount} overrides={overrides} />
	))

	await act(() => editor.createShape({ id: createShapeId(), type: 'geo' }).selectAll())

	// open the context menu:
	fireEvent.contextMenu(await screen.findByTestId('canvas'))

	// check that the context menu item was added:
	await screen.findByTestId('menu-item.tester')

	// It should disappear when we deselect all shapes:
	await act(() => editor.setSelectedShapes([]))
	expect(screen.queryByTestId('menu-item.tester')).toBeNull()

	// It should update its label when it changes:
	await act(() => editor.selectAll())
	const item = await screen.findByTestId('menu-item.tester')
	expect(item.textContent).toBe('Selected: 1')
	await act(() => editor.createShape({ id: createShapeId(), type: 'geo' }).selectAll())
	expect(item.textContent).toBe('Selected: 2')
})
