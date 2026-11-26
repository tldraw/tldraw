import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, definePlugin } from '@tldraw/editor'
import { createTldrawPlugins } from '../../lib/defaultPlugins'
import { Tldraw } from '../../lib/Tldraw'
import { uiActionItemsSlot, uiContextMenuSlot, uiMainMenuSlot } from '../../lib/ui/uiSlots'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let jumps = 0
const jumpPlugin = definePlugin({
	id: 'jump',
	setup(ctx) {
		ctx.contribute(uiActionItemsSlot, () => [
			{ id: 'jump', label: 'action.jump', onSelect: () => void jumps++ },
			{ id: 'never', label: 'action.never', isEnabled: () => false, onSelect() {} },
		])
		ctx.contribute(uiContextMenuSlot, { action: 'jump' })
		// A second placement of the same action shows one item.
		ctx.contribute(uiContextMenuSlot, { action: 'jump' })
		ctx.contribute(uiContextMenuSlot, { action: 'never' })
		ctx.contribute(uiContextMenuSlot, { action: 'not-defined' })
		ctx.contribute(uiMainMenuSlot, { action: 'jump' })
	},
})

async function renderWith(plugins = [...createTldrawPlugins(), jumpPlugin]) {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				plugins={plugins}
				onMount={(editor) => {
					editor.createShape({ id: createShapeId(), type: 'geo' })
					onMount(editor)
				}}
			/>
		),
		{ waitForPatterns: false }
	)
	return editor
}

async function openContextMenu() {
	fireEvent.contextMenu(await screen.findByTestId('canvas'))
	await screen.findByTestId('context-menu.select-all')
}

beforeEach(() => {
	jumps = 0
})

describe('menu items from plugins', () => {
	it('shows a placed action once in the context menu and runs it', async () => {
		await renderWith()
		await openContextMenu()
		const items = screen.getAllByTestId('context-menu.jump')
		expect(items).toHaveLength(1)
		expect(screen.getByTestId('context-menu-group.plugins').contains(items[0])).toBe(true)
		fireEvent.click(items[0])
		expect(jumps).toBe(1)
	})

	it('hides a disabled action and a placement for an action that no plugin defines', async () => {
		await renderWith()
		await openContextMenu()
		expect(screen.queryByTestId('context-menu.never')).toBeNull()
		expect(screen.queryByTestId('context-menu.not-defined')).toBeNull()
	})

	it('shows a placed action in the main menu', async () => {
		const editor = await renderWith()
		act(() => editor.menus.addOpenMenu('main menu'))
		await screen.findByTestId('main-menu.jump')
	})

	it('adds no group when no placement has an action', async () => {
		const strayPlugin = definePlugin({
			id: 'stray',
			setup(ctx) {
				ctx.contribute(uiContextMenuSlot, { action: 'not-defined' })
			},
		})
		await renderWith([...createTldrawPlugins(), strayPlugin])
		await openContextMenu()
		expect(screen.queryByTestId('context-menu-group.plugins')).toBeNull()
	})
})
