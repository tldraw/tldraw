import { fireEvent, screen } from '@testing-library/react'
import { atom, createShapeId, noop } from '@tldraw/editor'
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

it.failing('updates overrides reactively', async () => {
	const count = atom('count', 1)
	const overrides: TLUiOverrides = {
		contextMenu: (editor, schema) => {
			if (count.get() === 0) return schema
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
						label: `Count: ${count.get()}`,
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

	// It should disappear when count is 0:
	await act(() => count.set(0))
	expect(screen.queryByTestId('menu-item.tester')).toBeNull()

	// It should update its label when it changes:
	await act(() => count.set(1))
	const item = await screen.findByTestId('menu-item.tester')
	expect(item.textContent).toBe('Count: 1')
	await act(() => count.set(2))
	expect(item.textContent).toBe('Count: 2')
})
