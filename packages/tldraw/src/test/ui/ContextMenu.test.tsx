import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, tlenvReactive } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { DefaultContextMenu } from '../../lib/ui/components/ContextMenu/DefaultContextMenu'
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

describe('conversions submenus gate on their actions', () => {
	async function openContextMenu(overrides?: TLUiOverrides) {
		await renderTldrawComponent(
			<Tldraw
				overrides={overrides}
				onMount={(editor) => {
					editor.createShape({ id: createShapeId(), type: 'geo' })
				}}
			/>,
			{ waitForPatterns: false }
		)
		const canvas = await screen.findByTestId('canvas')
		fireEvent.contextMenu(canvas)
		await screen.findByTestId('context-menu')
		// wait for the menu to fully render before making absence assertions
		await screen.findByTestId('context-menu.select-all')
	}

	it('shows the export-as and copy-as submenus by default', async () => {
		await openContextMenu()
		expect(screen.queryByTestId('context-menu-sub.export-as-button')).not.toBeNull()
		expect(screen.queryByTestId('context-menu-sub.copy-as-button')).not.toBeNull()
	})

	it('hides the export-as submenu when all export actions are removed', async () => {
		await openContextMenu({
			actions(_editor, actions) {
				delete actions['export-as-svg']
				delete actions['export-as-png']
				return actions
			},
		})
		// regression for #9133: the submenu should not linger once its actions are gone
		expect(screen.queryByTestId('context-menu-sub.export-as-button')).toBeNull()
		// unrelated submenus are unaffected
		expect(screen.queryByTestId('context-menu-sub.copy-as-button')).not.toBeNull()
	})

	it('hides the copy-as submenu when all copy actions are removed', async () => {
		await openContextMenu({
			actions(_editor, actions) {
				delete actions['copy-as-svg']
				delete actions['copy-as-png']
				return actions
			},
		})
		expect(screen.queryByTestId('context-menu-sub.copy-as-button')).toBeNull()
		expect(screen.queryByTestId('context-menu-sub.export-as-button')).not.toBeNull()
	})

	it('keeps the export-as submenu when at least one export action remains', async () => {
		await openContextMenu({
			actions(_editor, actions) {
				delete actions['export-as-svg']
				return actions
			},
		})
		expect(screen.queryByTestId('context-menu-sub.export-as-button')).not.toBeNull()
	})
})
