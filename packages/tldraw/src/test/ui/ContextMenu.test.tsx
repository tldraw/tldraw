import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, tlenvReactive } from '@tldraw/editor'
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

// A touch long-press (coarse pointer) opens the menu only in the select tool. In any
// other tool the long-press belongs to that tool's gesture, so the menu stays closed.
// The instance's isCoarsePointer is synced from tlenv, so flip that to simulate touch.
describe('on a coarse pointer (touch long-press)', () => {
	beforeEach(() => {
		tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: true }))
	})
	afterEach(() => {
		tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: false }))
	})

	it('opens the menu in the select tool', async () => {
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
	})

	it.each([
		'geo',
		'note',
		'line',
		'text',
		'arrow',
		'frame',
		'eraser',
		'draw',
		'highlight',
		'laser',
		'hand',
		'zoom',
	])('does not open the menu in the %s tool', async (tool) => {
		await renderTldrawComponent(
			<Tldraw
				onMount={(editor) => {
					editor.createShape({ id: createShapeId(), type: 'geo' })
					editor.setCurrentTool(tool)
				}}
			/>,
			{ waitForPatterns: false }
		)
		const canvas = await screen.findByTestId('canvas')

		fireEvent.contextMenu(canvas)
		expect(screen.queryByTestId('context-menu')).toBeNull()
	})
})

// A right-click (fine pointer) opens the menu in any tool — the editor routes the
// click through the select tool. Regression guard: gating on the tool instead of the
// pointer type used to suppress this because the switch-to-select lagged the render.
it.each(['select', 'geo', 'note', 'eraser', 'draw'])(
	'opens on right-click in the %s tool',
	async (tool) => {
		await renderTldrawComponent(
			<Tldraw
				onMount={(editor) => {
					editor.createShape({ id: createShapeId(), type: 'geo' })
					editor.setCurrentTool(tool)
				}}
			/>,
			{ waitForPatterns: false }
		)
		const canvas = await screen.findByTestId('canvas')

		fireEvent.contextMenu(canvas)
		await screen.findByTestId('context-menu')
	}
)

it('right-click in a shape tool reveals shape actions (rightClickPanning off)', async () => {
	// Regression for #8277: a right-click while a shape-creation tool is active
	// should switch to the select tool and select the shape under the pointer
	// *before* the menu opens, so the menu carries the full set of shape actions.
	// With rightClickPanning off the native contextmenu fires on press, so the
	// switch must complete synchronously on the pointer-down — this asserts the
	// switch beats the menu.
	const id = createShapeId()
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				options={{ rightClickPanning: false }}
				onMount={(editor) => {
					editor.createShape({
						id,
						type: 'geo',
						x: 0,
						y: 0,
						props: { w: 100, h: 100, geo: 'rectangle' },
					})
					editor.setCurrentTool('geo')
					onMount(editor)
				}}
			/>
		),
		{ waitForPatterns: false }
	)

	const canvas = await screen.findByTestId('canvas')

	// right-click over the shape: the button-2 pointer-down dispatches a
	// `right_click`, which the geo tool's idle routes through the select tool.
	act(() => {
		editor.dispatch({
			type: 'pointer',
			name: 'pointer_down',
			target: 'canvas',
			point: { x: 50, y: 50, z: 0.5 },
			pointerId: 1,
			button: 2,
			isPen: false,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			accelKey: false,
		})
	})

	// the switch beats the menu: select is active and the shape is selected
	// before the contextmenu event is ever handled
	expect(editor.getCurrentToolId()).toBe('select')
	expect(editor.getSelectedShapeIds()).toEqual([id])

	fireEvent.contextMenu(canvas)
	await screen.findByTestId('context-menu')
	// shape actions are present because the shape is selected
	await screen.findByTestId('context-menu.cut')
	await screen.findByTestId('context-menu.copy')
	await screen.findByTestId('context-menu.delete')
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
