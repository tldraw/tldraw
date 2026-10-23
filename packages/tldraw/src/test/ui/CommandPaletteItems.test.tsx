import { act, waitFor } from '@testing-library/react'
import { atom, useValue } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { CommandPaletteStoreProvider } from '../../lib/ui/components/CommandPalette/CommandPaletteContext'
import { CommandPaletteStore } from '../../lib/ui/components/CommandPalette/CommandPaletteStore'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../../lib/ui/components/primitives/menus/TldrawUiMenuSubmenu'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () =>
	vi.importActual('../../lib/ui/hooks/useTranslation/useTranslation')
)

async function renderItems(children: ReactNode) {
	const store = new CommandPaletteStore()
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<CommandPaletteStoreProvider store={store}>
					<TldrawUiMenuContextProvider type="command-palette" sourceId="command-palette">
						{children}
					</TldrawUiMenuContextProvider>
				</CommandPaletteStoreProvider>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	return { editor, store, ids: () => store.entries.get().map((e) => e.id) }
}

describe('menu items in the command palette', () => {
	it('register with resolved labels, paths and state', async () => {
		const onUndo = vi.fn()
		const { store, ids } = await renderItems(
			<TldrawUiMenuGroup id="edit" label="menu.edit">
				<TldrawUiMenuItem id="undo-item" label="action.undo" kbd="cmd+z" onSelect={onUndo} />
				<TldrawUiMenuSubmenu id="theme" label="menu.theme">
					<TldrawUiMenuCheckboxItem id="dark" label="theme.dark" checked onSelect={() => {}} />
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuItem
					id="redo-item"
					label="action.redo"
					disabled
					disabledReason="command-palette.reason.nothing-to-redo"
					onSelect={() => {}}
				/>
			</TldrawUiMenuGroup>
		)
		await waitFor(() => expect(ids()).toEqual(['undo-item', 'dark', 'redo-item']))
		const [undo, dark, redo] = store.entries.get()
		expect(undo).toMatchObject({
			label: 'Undo',
			path: ['Edit'],
			kbd: 'cmd+z',
			disabled: false,
			submenu: null,
		})
		expect(dark).toMatchObject({
			label: 'Theme: Dark',
			name: 'Dark',
			path: ['Edit', 'Theme'],
			checked: true,
			submenu: { label: 'Theme' },
		})
		expect(redo).toMatchObject({ disabled: true, disabledReason: 'Nothing to redo' })
		undo.onSelect('command-palette')
		expect(onUndo).toHaveBeenCalledWith('command-palette')
	})

	it('use the command palette label variant', async () => {
		const { store, ids } = await renderItems(
			<TldrawUiMenuItem
				id="x"
				label={{ default: 'action.undo', 'command-palette': 'action.redo' }}
				onSelect={() => {}}
			/>
		)
		await waitFor(() => expect(ids()).toEqual(['x']))
		expect(store.entries.get()[0].label).toBe('Redo')
	})

	it('pass a disabled reason through action items', async () => {
		const { store, ids } = await renderItems(
			<TldrawUiMenuActionItem
				actionId="undo"
				disabled
				disabledReason="command-palette.reason.nothing-to-undo"
			/>
		)
		await waitFor(() => expect(ids()).toEqual(['undo']))
		expect(store.entries.get()[0]).toMatchObject({
			label: 'Undo',
			disabled: true,
			disabledReason: 'Nothing to undo',
		})
	})

	it('drop out in readonly mode unless they are readonlyOk', async () => {
		const { editor, ids } = await renderItems(
			<>
				<TldrawUiMenuItem id="edit-only" label="action.undo" onSelect={() => {}} />
				<TldrawUiMenuItem id="always" label="action.zoom-in" readonlyOk onSelect={() => {}} />
			</>
		)
		await waitFor(() => expect(ids()).toEqual(['edit-only', 'always']))
		act(() => editor.updateInstanceState({ isReadonly: true }))
		await waitFor(() => expect(ids()).toEqual(['always']))
	})

	it('skip disabled submenus', async () => {
		const { ids } = await renderItems(
			<>
				<TldrawUiMenuSubmenu id="off" label="menu.theme" disabled>
					<TldrawUiMenuItem id="hidden" label="theme.dark" onSelect={() => {}} />
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuItem id="shown" label="action.undo" onSelect={() => {}} />
			</>
		)
		await waitFor(() => expect(ids()).toEqual(['shown']))
	})

	it('keep JSX order when an earlier item mounts later', async () => {
		const showLate = atom('show late', false)
		function Late() {
			const show = useValue(showLate)
			return show ? <TldrawUiMenuItem id="late" label="action.redo" onSelect={() => {}} /> : null
		}
		const { ids } = await renderItems(
			<>
				<Late />
				<TldrawUiMenuItem id="first" label="action.undo" onSelect={() => {}} />
			</>
		)
		await waitFor(() => expect(ids()).toEqual(['first']))
		act(() => showLate.set(true))
		await waitFor(() => expect(ids()).toEqual(['late', 'first']))
	})
})
