import { act, fireEvent, screen } from '@testing-library/react'
import { atom, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { GroupOrUngroupMenuItem } from '../../lib/ui/components/ActionsMenu/DefaultActionsMenuContent'
import { DefaultMainMenu } from '../../lib/ui/components/MainMenu/DefaultMainMenu'
import { TldrawUiMenuActionCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiToolbar } from '../../lib/ui/components/primitives/TldrawUiToolbar'
import { TLUiActionItem } from '../../lib/ui/context/actions'
import { useSomeActionsEnabled } from '../../lib/ui/hooks/useActionState'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const $enabled = atom('test enabled', false)
const $available = atom('test available', false)

const overrides: TLUiOverrides = {
	actions(_editor, actions) {
		actions['gated'] = {
			id: 'gated',
			label: 'action.group',
			icon: 'group',
			isEnabled: () => $enabled.get(),
			onSelect() {},
		}
		actions['ungated'] = { id: 'ungated', label: 'action.group', icon: 'group', onSelect() {} }
		actions['unavailable'] = {
			id: 'unavailable',
			label: 'action.group',
			icon: 'group',
			isAvailable: () => $available.get(),
			onSelect() {},
		}
		actions['group-spread'] = { ...actions['group'], id: 'group-spread', onSelect() {} }
		actions['group-replaced'] = {
			id: 'group-replaced',
			label: 'action.group',
			icon: 'group',
			onSelect() {},
		}
		return actions
	},
}

function SomeEnabled({ ids }: { ids: string[] }) {
	return <span data-testid="some">{String(useSomeActionsEnabled(ids))}</span>
}

async function setup(children: React.ReactNode) {
	act(() => {
		$enabled.set(false)
		$available.set(false)
	})
	return renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} overrides={overrides} components={{ QuickActions: null }}>
				<TldrawUiToolbar label="test">
					<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
						{children}
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
}

const button = (id: string) =>
	screen.queryByTestId(`actions-menu.${id}`) as HTMLButtonElement | null

describe('TldrawUiMenuActionItem', () => {
	it('disables by default and follows isEnabled reactively', async () => {
		await setup(<TldrawUiMenuActionItem actionId="gated" />)
		expect(button('gated')!.disabled).toBe(true)
		act(() => $enabled.set(true))
		expect(button('gated')!.disabled).toBe(false)
	})

	it('hides when disabled with whenDisabled="hide"', async () => {
		await setup(<TldrawUiMenuActionItem actionId="gated" whenDisabled="hide" />)
		expect(button('gated')).toBeNull()
		act(() => $enabled.set(true))
		expect(button('gated')).not.toBeNull()
	})

	it('hides on an explicit disabled prop with whenDisabled="hide"', async () => {
		await setup(<TldrawUiMenuActionItem actionId="ungated" disabled whenDisabled="hide" />)
		expect(button('ungated')).toBeNull()
	})

	it('keeps actions without isEnabled enabled', async () => {
		await setup(<TldrawUiMenuActionItem actionId="ungated" whenDisabled="hide" />)
		expect(button('ungated')!.disabled).toBe(false)
	})

	it('ORs an explicit disabled prop with isEnabled', async () => {
		await setup(<TldrawUiMenuActionItem actionId="gated" disabled />)
		act(() => $enabled.set(true))
		expect(button('gated')!.disabled).toBe(true)
	})

	it('stays disabled when isEnabled is false even with disabled={false}', async () => {
		await setup(<TldrawUiMenuActionItem actionId="gated" disabled={false} />)
		expect(button('gated')!.disabled).toBe(true)
	})

	it('keeps the gate on a spread override and drops it on a wholesale replacement', async () => {
		const { editor } = await setup(
			<>
				<TldrawUiMenuActionItem actionId="group-spread" />
				<TldrawUiMenuActionItem actionId="group-replaced" />
			</>
		)
		expect(button('group-spread')!.disabled).toBe(true)
		expect(button('group-replaced')!.disabled).toBe(false)
		act(() => {
			editor.createShapes([
				{ id: createShapeId('a'), type: 'geo' },
				{ id: createShapeId('b'), type: 'geo', x: 200 },
			])
			editor.selectAll()
		})
		expect(button('group-spread')!.disabled).toBe(false)
	})
})

describe('isAvailable', () => {
	it('hides the menu item whatever whenDisabled says', async () => {
		await setup(<TldrawUiMenuActionItem actionId="unavailable" whenDisabled="disable" />)
		expect(button('unavailable')).toBeNull()
		act(() => $available.set(true))
		expect(button('unavailable')!.disabled).toBe(false)
	})

	it('counts as not enabled for useSomeActionsEnabled', async () => {
		await setup(<SomeEnabled ids={['unavailable']} />)
		expect(screen.getByTestId('some').textContent).toBe('false')
		act(() => $available.set(true))
		expect(screen.getByTestId('some').textContent).toBe('true')
	})
})

describe('useSomeActionsEnabled', () => {
	it('is true when any listed action is enabled and ignores unknown ids', async () => {
		await setup(<SomeEnabled ids={['gated', 'missing']} />)
		expect(screen.getByTestId('some').textContent).toBe('false')
		act(() => $enabled.set(true))
		expect(screen.getByTestId('some').textContent).toBe('true')
	})

	it('treats non-readonlyOk actions as unavailable in readonly', async () => {
		const { editor } = await setup(<SomeEnabled ids={['ungated']} />)
		expect(screen.getByTestId('some').textContent).toBe('true')
		act(() => editor.updateInstanceState({ isReadonly: true }))
		expect(screen.getByTestId('some').textContent).toBe('false')
	})
})

describe('GroupOrUngroupMenuItem', () => {
	it('shows ungroup when the group action was deleted', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_e, actions) {
							delete actions['group']
							return actions
						},
					}}
				>
					<TldrawUiToolbar label="test">
						<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
							<GroupOrUngroupMenuItem />
						</TldrawUiMenuContextProvider>
					</TldrawUiToolbar>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		const group = createShapeId('group')
		act(() => {
			editor.createShapes([
				{ id: createShapeId('a'), type: 'geo' },
				{ id: createShapeId('b'), type: 'geo', x: 200 },
			])
			editor.groupShapes([createShapeId('a'), createShapeId('b')], { groupId: group })
			editor.select(group)
		})
		expect(button('ungroup')).not.toBeNull()
	})
})

describe('helper buttons', () => {
	it('do not run a disabled action', async () => {
		const onSelect = vi.fn()
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['blocked'] = {
								id: 'blocked',
								label: 'action.group',
								icon: 'group',
								isEnabled: () => false,
								onSelect,
							}
							return actions
						},
					}}
				>
					<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
						<TldrawUiMenuActionItem actionId="blocked" />
					</TldrawUiMenuContextProvider>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		const el = screen.getByTestId('helper-buttons.blocked') as HTMLButtonElement
		expect(el.disabled).toBe(true)
		fireEvent.click(el)
		expect(onSelect).not.toHaveBeenCalled()
	})
})

describe('keyboard shortcuts dialog', () => {
	async function renderDialogItem(props: { whenDisabled?: 'hide' | 'disable' }) {
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['unavailable-kbd'] = {
								id: 'unavailable-kbd',
								label: 'action.group',
								kbd: 'shift+9',
								isAvailable: () => false,
								onSelect() {},
							}
							return actions
						},
					}}
				>
					<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
						<TldrawUiMenuActionItem actionId="unavailable-kbd" {...props} />
					</TldrawUiMenuContextProvider>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		return screen.queryByTestId('kbd.unavailable-kbd')
	}

	it('lists an unavailable action', async () => {
		expect(await renderDialogItem({})).not.toBeNull()
	})

	it("hides an available action that can't run when the item would hide", async () => {
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['disabled-kbd'] = {
								id: 'disabled-kbd',
								label: 'action.group',
								kbd: 'shift+8',
								isEnabled: () => false,
								onSelect() {},
							}
							return actions
						},
					}}
				>
					<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
						<TldrawUiMenuActionItem actionId="disabled-kbd" whenDisabled="hide" />
					</TldrawUiMenuContextProvider>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		expect(screen.queryByTestId('kbd.disabled-kbd')).toBeNull()
	})

	it('lists an unavailable action even when the item would hide', async () => {
		expect(await renderDialogItem({ whenDisabled: 'hide' })).not.toBeNull()
	})
})

describe('TldrawUiMenuActionCheckboxItem', () => {
	it('reads checked from isChecked unless checked is passed, and follows isEnabled', async () => {
		const $checked = atom('test checked', false)
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					overrides={{
						actions(_editor, actions) {
							actions['test-toggle'] = {
								id: 'test-toggle',
								label: 'action.toggle-grid',
								checkbox: true,
								isChecked: () => $checked.get(),
								isEnabled: () => $enabled.get(),
								onSelect() {},
							}
							return actions
						},
					}}
					components={{
						MainMenu: () => (
							<DefaultMainMenu>
								<TldrawUiMenuActionCheckboxItem actionId="test-toggle" />
								<TldrawUiMenuActionCheckboxItem actionId="toggle-snap-mode" checked />
								<TldrawUiMenuActionCheckboxItem
									actionId="toggle-wrap-mode"
									disabled
									whenDisabled="hide"
								/>
							</DefaultMainMenu>
						),
					}}
				/>
			),
			{ waitForPatterns: false }
		)
		act(() => $enabled.set(false))
		act(() => editor.menus.addOpenMenu('main menu'))
		const toggle = await screen.findByRole('menuitemcheckbox', { name: /grid/i })
		const forced = screen.getByRole('menuitemcheckbox', { name: /snap/i })
		expect([toggle.getAttribute('aria-checked'), toggle.hasAttribute('data-disabled')]).toEqual([
			'false',
			true,
		])
		expect(forced.getAttribute('aria-checked')).toBe('true')
		expect(screen.queryByRole('menuitemcheckbox', { name: /wrap/i })).toBeNull()
		act(() => {
			$checked.set(true)
			$enabled.set(true)
		})
		expect([toggle.getAttribute('aria-checked'), toggle.hasAttribute('data-disabled')]).toEqual([
			'true',
			false,
		])
	})
})

describe('a predicate that throws', () => {
	it('keeps an unavailable action hidden when another of its predicates throws', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['throws-checked'] = {
								id: 'throws-checked',
								label: 'action.group',
								icon: 'group',
								isAvailable: () => false,
								isChecked: () => {
									throw new Error('boom')
								},
								onSelect() {},
							}
							return actions
						},
					}}
				>
					<TldrawUiToolbar label="test">
						<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
							<TldrawUiMenuActionItem actionId="throws-checked" />
						</TldrawUiMenuContextProvider>
					</TldrawUiToolbar>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		expect(button('throws-checked')).toBeNull()
		error.mockRestore()
	})

	it('disables the item, reports once, and keeps the editor running', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['throws'] = {
								id: 'throws',
								label: 'action.group',
								icon: 'group',
								isEnabled: (editor) => {
									editor.getSelectedShapeIds()
									throw new Error('boom')
								},
								onSelect() {},
							}
							return actions
						},
					}}
				>
					<TldrawUiToolbar label="test">
						<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
							<TldrawUiMenuActionItem actionId="throws" />
						</TldrawUiMenuContextProvider>
					</TldrawUiToolbar>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		act(() => {
			editor.createShapes([{ id: createShapeId('a'), type: 'geo' }])
			editor.selectAll()
		})
		expect(button('throws')!.disabled).toBe(true)
		expect(screen.queryAllByTestId('canvas').length).toBeGreaterThan(0)
		expect(error.mock.calls.filter(([msg]) => String(msg).includes('"throws"'))).toHaveLength(1)
		error.mockRestore()
	})

	async function renderThrowing(action: Partial<TLUiActionItem>) {
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					components={{ QuickActions: null }}
					overrides={{
						actions(_editor, actions) {
							actions['throwing'] = {
								id: 'throwing',
								label: 'action.group',
								icon: 'group',
								onSelect() {},
								...action,
							}
							return actions
						},
					}}
				>
					<TldrawUiToolbar label="test">
						<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
							<TldrawUiMenuActionItem actionId="throwing" />
							<SomeEnabled ids={['throwing']} />
						</TldrawUiMenuContextProvider>
					</TldrawUiToolbar>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		return {
			disabled: button('throwing')?.disabled,
			someEnabled: screen.getByTestId('some').textContent,
		}
	}

	it('disables an item whose isChecked throws', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const thrower = () => {
			throw new Error('boom')
		}
		expect(await renderThrowing({ checkbox: true, isChecked: thrower })).toEqual({
			disabled: true,
			someEnabled: 'false',
		})
		error.mockRestore()
	})

	it('disables an item whose isAvailable throws', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const thrower = () => {
			throw new Error('boom')
		}
		expect(await renderThrowing({ isAvailable: thrower })).toEqual({
			disabled: true,
			someEnabled: 'false',
		})
		error.mockRestore()
	})
})
