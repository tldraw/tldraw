import { fireEvent, screen, waitFor } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { DefaultContextMenu } from '../../lib/ui/components/ContextMenu/DefaultContextMenu'
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

it('does not clear locked selection when closing context menu on desktop', async () => {
	const lockedShapeId = createShapeId()

	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={(editor) => {
					onMount(editor)
					editor.createShape({
						id: lockedShapeId,
						type: 'geo',
						isLocked: true,
						x: 100,
						y: 100,
					})
					editor.select(lockedShapeId)
				}}
			/>
		),
		{ waitForPatterns: false }
	)

	const canvas = await screen.findByTestId('canvas')
	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')

	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('context-menu')).toBeNull()
	expect(editor.getOnlySelectedShape()?.id).toBe(lockedShapeId)
})

it('closes context menu on primary pointer down in menu click capture', async () => {
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

	const capture = await screen.findByTestId('menu-click-capture.content')
	fireEvent.pointerDown(capture, {
		button: 0,
		clientX: 20,
		clientY: 20,
		pointerId: 1,
		pointerType: 'mouse',
	})

	await waitFor(() => {
		expect(screen.queryByTestId('context-menu')).toBeNull()
	})
})

it('closes context menu on touch-style pointer down in menu click capture', async () => {
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

	const capture = await screen.findByTestId('menu-click-capture.content')
	fireEvent.pointerDown(capture, {
		button: 0,
		clientX: 20,
		clientY: 20,
		pointerId: 1,
		pointerType: 'touch',
	})

	await waitFor(() => {
		expect(screen.queryByTestId('context-menu')).toBeNull()
	})
})
