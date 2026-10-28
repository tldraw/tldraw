import { act, screen } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import {
	ARRANGE_ACTIONS,
	ArrangeMenuSubmenu,
	EDIT_ACTIONS,
	EditMenuSubmenu,
	REORDER_ACTIONS,
	ReorderMenuSubmenu,
} from '../../lib/ui/components/menu-items'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TLUiActionsContextType } from '../../lib/ui/context/actions'
import { useSomeActionsEnabled } from '../../lib/ui/hooks/useActionState'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// The keyboard-shortcuts menu type renders submenu children inline, so an item that renders
// shows up by test id without opening a Radix submenu.
async function setup(overrides: TLUiOverrides) {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} overrides={overrides} components={{ QuickActions: null }}>
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					<EditMenuSubmenu />
					<ArrangeMenuSubmenu />
					<ReorderMenuSubmenu />
				</TldrawUiMenuContextProvider>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	act(() => {
		editor.createShapes([
			{ id: createShapeId('a'), type: 'geo' },
			{ id: createShapeId('b'), type: 'geo', x: 200 },
		])
	})
	return editor
}

const row = (id: string) => screen.queryByTestId(`kbd.${id}`)

describe('context menu submenus', () => {
	it('stay hidden with nothing selected when an action is replaced without isEnabled', async () => {
		const replaced = ['toggle-lock', 'align-left', 'bring-to-front']
		const editor = await setup({
			actions(_editor, actions) {
				for (const id of replaced) {
					actions[id] = { id, label: actions[id].label, kbd: actions[id].kbd, onSelect() {} }
				}
				return actions
			},
		})
		expect(replaced.map(row)).toEqual([null, null, null])
		act(() => editor.selectAll())
		expect(replaced.map((id) => row(id) !== null)).toEqual([true, true, true])
	})
})

const SUBMENU_ACTIONS = [...EDIT_ACTIONS, ...ARRANGE_ACTIONS, ...REORDER_ACTIONS]

describe('submenu action lists', () => {
	it('only name built-in actions', async () => {
		let actions: TLUiActionsContextType = {}
		await setup({
			actions(_editor, a) {
				actions = a
				return a
			},
		})
		expect(SUBMENU_ACTIONS.filter((id) => !actions[id])).toEqual([])
	})

	it('report nothing enabled when every listed action was deleted', async () => {
		function Probe() {
			const states = [
				useSomeActionsEnabled(EDIT_ACTIONS),
				useSomeActionsEnabled(ARRANGE_ACTIONS),
				useSomeActionsEnabled(REORDER_ACTIONS),
			]
			return <span data-testid="probe">{states.join(' ')}</span>
		}
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							for (const id of SUBMENU_ACTIONS) delete actions[id]
							return actions
						},
					}}
				>
					<Probe />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		act(() => {
			editor.createShapes([
				{ id: createShapeId('a'), type: 'geo' },
				{ id: createShapeId('b'), type: 'geo', x: 200 },
				{ id: createShapeId('c'), type: 'geo', x: 400 },
			])
			editor.selectAll()
		})
		expect(screen.getByTestId('probe').textContent).toBe('false false false')
	})
})
