import { act, screen } from '@testing-library/react'
import { atom } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiToolbar } from '../../lib/ui/components/primitives/TldrawUiToolbar'
import { useSomeActionsEnabled } from '../../lib/ui/hooks/useActionState'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const $enabled = atom('test enabled', false)

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
	act(() => $enabled.set(false))
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

	it('keeps actions without isEnabled enabled', async () => {
		await setup(<TldrawUiMenuActionItem actionId="ungated" whenDisabled="hide" />)
		expect(button('ungated')!.disabled).toBe(false)
	})

	it('ORs an explicit disabled prop with isEnabled', async () => {
		await setup(<TldrawUiMenuActionItem actionId="ungated" disabled />)
		expect(button('ungated')!.disabled).toBe(true)
	})

	// Task 4 enables this once `group` has isEnabled
	it.todo('keeps the gate on a spread override and drops it on a wholesale replacement')
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
