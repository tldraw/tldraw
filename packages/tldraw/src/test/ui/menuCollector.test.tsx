import { act, screen } from '@testing-library/react'
import { createContext, ReactNode, useContext, useLayoutEffect } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { TldrawUiMenuActionCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
import {
	TldrawUiMenuContextProvider,
	TLUiMenuCollector,
	TLUiMenuCollectorItem,
} from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../../lib/ui/components/primitives/menus/TldrawUiMenuSubmenu'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// setupVitest.js stubs translation to return keys; labels here must be really translated.
vi.unmock('../../lib/ui/hooks/useTranslation/useTranslation')

type Collected = Omit<TLUiMenuCollectorItem, 'onSelect'> & { path: string[] }

const PathContext = createContext<string[]>([])
let collected = new Map<string, Collected>()

function Register({ item }: { item: TLUiMenuCollectorItem }) {
	const path = useContext(PathContext)
	useLayoutEffect(() => {
		const { onSelect: _onSelect, ...rest } = item
		collected.set(item.id, { ...rest, path })
		return () => void collected.delete(item.id)
	})
	return null
}

function Nest({ label, children }: { label?: string; children: ReactNode }) {
	const path = useContext(PathContext)
	return (
		<PathContext.Provider value={label ? [...path, label] : path}>{children}</PathContext.Provider>
	)
}

const collector: TLUiMenuCollector = {
	renderItem: (item) => <Register item={item} />,
	renderGroup: ({ label, children }) => <Nest label={label}>{children}</Nest>,
	renderSubmenu: ({ label, disabled, children }) =>
		disabled ? null : <Nest label={label}>{children}</Nest>,
}

async function setup(children: ReactNode) {
	collected = new Map()
	return renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				overrides={{
					translations: {
						en: {
							'menu.edit': 'Edit',
							'action.group': 'Group',
							'action.ungroup': 'Ungroup',
							'action.toggle-snap-mode': 'Always snap',
							'context-menu.arrange': 'Arrange',
						},
					},
					actions(_editor, actions) {
						actions['never-enabled'] = {
							id: 'never-enabled',
							label: 'action.group',
							readonlyOk: true,
							isEnabled: () => false,
							onSelect() {},
						}
						actions['never-enabled-toggle'] = {
							id: 'never-enabled-toggle',
							label: 'action.toggle-grid',
							checkbox: true,
							readonlyOk: true,
							isEnabled: () => false,
							onSelect() {},
						}
						return actions
					},
				}}
				components={{
					CommandPalette: () => (
						<div data-testid="collector-root">
							<TldrawUiMenuContextProvider
								type="collector"
								sourceId="unknown"
								collector={collector}
							>
								{children}
							</TldrawUiMenuContextProvider>
						</div>
					),
				}}
			/>
		),
		{ waitForPatterns: false }
	)
}

describe('menu collector', () => {
	it('reports translated items, checkbox items, groups and submenus, rendering nothing', async () => {
		await setup(
			<TldrawUiMenuGroup id="edit" label="menu.edit">
				<TldrawUiMenuItem
					id="item"
					label="action.group"
					kbd="$g"
					detail="Somewhere"
					isSelected
					readonlyOk
					onSelect={() => {}}
				/>
				<TldrawUiMenuGroup id="unlabelled">
					<TldrawUiMenuCheckboxItem
						id="check"
						label="action.toggle-snap-mode"
						checked
						readonlyOk
						onSelect={() => {}}
					/>
				</TldrawUiMenuGroup>
				<TldrawUiMenuSubmenu id="sub" label="context-menu.arrange">
					<TldrawUiMenuItem id="nested" label="action.ungroup" readonlyOk onSelect={() => {}} />
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuSubmenu id="disabled-sub" label="context-menu.arrange" disabled>
					<TldrawUiMenuItem
						id="unreachable"
						label="action.ungroup"
						readonlyOk
						onSelect={() => {}}
					/>
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuItem id="no-label" readonlyOk onSelect={() => {}} />
			</TldrawUiMenuGroup>
		)
		expect(Object.fromEntries(collected)).toEqual({
			item: {
				id: 'item',
				label: 'Group',
				kbd: '$g',
				disabled: false,
				isSelected: true,
				detail: 'Somewhere',
				path: ['Edit'],
			},
			check: {
				id: 'check',
				label: 'Always snap',
				kbd: undefined,
				disabled: false,
				checked: true,
				path: ['Edit'],
			},
			nested: {
				id: 'nested',
				label: 'Ungroup',
				kbd: undefined,
				disabled: false,
				isSelected: undefined,
				detail: undefined,
				path: ['Edit', 'Arrange'],
			},
		})
		expect(screen.getByTestId('collector-root').innerHTML).toBe('')
	})

	it('reports disabled action items marked disabled, even with whenDisabled="hide"', async () => {
		await setup(
			<>
				<TldrawUiMenuActionItem actionId="never-enabled" whenDisabled="hide" />
				<TldrawUiMenuActionCheckboxItem actionId="never-enabled-toggle" whenDisabled="hide" />
			</>
		)
		expect([...collected.values()].map(({ id, disabled }) => ({ id, disabled }))).toEqual([
			{ id: 'never-enabled', disabled: true },
			{ id: 'never-enabled-toggle', disabled: true },
		])
	})

	it('drops items that are not readonlyOk in readonly mode', async () => {
		const { editor } = await setup(
			<>
				<TldrawUiMenuItem id="ok" label="action.group" readonlyOk onSelect={() => {}} />
				<TldrawUiMenuItem id="not-ok" label="action.ungroup" onSelect={() => {}} />
				<TldrawUiMenuCheckboxItem id="check" label="action.toggle-grid" onSelect={() => {}} />
			</>
		)
		expect([...collected.keys()].sort()).toEqual(['check', 'not-ok', 'ok'])
		act(() => editor.updateInstanceState({ isReadonly: true }))
		expect([...collected.keys()]).toEqual(['ok'])
	})
})
