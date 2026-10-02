import { act, fireEvent, screen } from '@testing-library/react'
import { createShapeId, Editor, TLShapeId } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { DefaultActionsMenuContent } from '../../lib/ui/components/ActionsMenu/DefaultActionsMenuContent'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiToolbar } from '../../lib/ui/components/primitives/TldrawUiToolbar'
import { DefaultQuickActionsContent } from '../../lib/ui/components/QuickActions/DefaultQuickActionsContent'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// Paste renders only when the clipboard API exists at module load.
vi.hoisted(() => {
	Object.assign(navigator, { clipboard: { read: vi.fn(), write: vi.fn() } })
	// @ts-expect-error jsdom has no ClipboardItem
	window.ClipboardItem = class {}
})

type Gate = 'hidden' | 'disabled' | 'enabled'
type State =
	| 'empty'
	| 'one'
	| 'two'
	| 'three'
	| 'lockedPair'
	| 'group'
	| 'boundArrow'
	| 'twoInHand'
	| 'readonly'
	| 'groupWithLocked'
	| 'lockedGroup'
	| 'lockedThree'
	| 'groupInHand'

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	arrow: createShapeId('arrow'),
	group: createShapeId('group'),
}

function applyState(editor: Editor, state: State) {
	act(() => {
		editor.updateInstanceState({ isReadonly: false })
		editor.selectNone()
		editor.setCurrentTool('select')
		editor.deleteShapes([...editor.getCurrentPageShapeIds()])
		if (state === 'empty') return
		editor.createShapes([
			{ id: ids.a, type: 'geo', x: 0, y: 0 },
			{ id: ids.b, type: 'geo', x: 200, y: 0 },
			{ id: ids.c, type: 'geo', x: 400, y: 0 },
		])
		const select = (...s: TLShapeId[]) => editor.select(...s)
		switch (state) {
			case 'one':
				return select(ids.a)
			case 'two':
				return select(ids.a, ids.b)
			case 'readonly':
				select(ids.a, ids.b)
				return editor.updateInstanceState({ isReadonly: true })
			case 'three':
				return select(ids.a, ids.b, ids.c)
			case 'lockedPair':
				editor.updateShapes([
					{ id: ids.a, type: 'geo', isLocked: true },
					{ id: ids.b, type: 'geo', isLocked: true },
				])
				return select(ids.a, ids.b)
			case 'group':
				editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
				return select(ids.group)
			case 'boundArrow':
				editor.createShape({
					id: ids.arrow,
					type: 'arrow',
					x: 100,
					y: 50,
					props: { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
				})
				for (const [terminal, toId] of [
					['start', ids.a],
					['end', ids.b],
				] as const) {
					editor.createBinding({
						type: 'arrow',
						fromId: ids.arrow,
						toId,
						props: {
							terminal,
							isExact: false,
							isPrecise: false,
							normalizedAnchor: { x: 0.5, y: 0.5 },
							snap: 'none',
						},
					})
				}
				// b is bound but not selected
				return select(ids.arrow, ids.a, ids.c)
			case 'twoInHand':
				select(ids.a, ids.b)
				return editor.setCurrentTool('hand')
			case 'lockedGroup':
				editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
				editor.updateShapes([{ id: ids.group, type: 'group', isLocked: true }])
				return select(ids.group)
			case 'lockedThree':
				editor.updateShapes(
					[ids.a, ids.b, ids.c].map((id) => ({ id, type: 'geo', isLocked: true }))
				)
				return select(ids.a, ids.b, ids.c)
			case 'groupInHand':
				editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
				select(ids.group)
				return editor.setCurrentTool('hand')
			case 'groupWithLocked':
				editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
				editor.updateShapes([{ id: ids.c, type: 'geo', isLocked: true }])
				return select(ids.group, ids.c)
		}
	})
}

function readGates(prefix: string, actionIds: readonly string[]): Record<string, Gate> {
	return Object.fromEntries(
		actionIds.map((id) => {
			const el = screen.queryByTestId(`${prefix}.${id}`) as HTMLButtonElement | null
			const gate: Gate = !el
				? 'hidden'
				: el.disabled ||
					  el.getAttribute('aria-disabled') === 'true' ||
					  el.hasAttribute('data-disabled')
					? 'disabled'
					: 'enabled'
			return [id, gate]
		})
	)
}

const GATES = { H: 'hidden', D: 'disabled', E: 'enabled' } as const

// Rows list one letter per column, in column order: H hidden, D disabled, E enabled.
function expected(columns: readonly string[], row: string | undefined): Record<string, Gate> {
	const letters = (row ?? '').split(' ') as (keyof typeof GATES)[]
	if (letters.length !== columns.length) throw new Error(`Row "${row}" doesn't match ${columns}`)
	return Object.fromEntries(columns.map((id, i) => [id, GATES[letters[i]]]))
}

const submenuTrigger = (prefix: string, id: string) =>
	screen.queryByTestId(`${prefix}-sub.${id}-button`) ? 'enabled' : 'hidden'

// The default UI mounts its own quick actions with the same test ids.
async function renderWith(children?: ReactNode) {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} components={children ? { QuickActions: null } : undefined}>
				{children}
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	return editor
}

/* --------------------------- toolbar actions menu -------------------------- */

const AM_IDS = [
	'align-left',
	'distribute-horizontal',
	'stack-horizontal',
	'bring-to-front',
	'rotate-cw',
	'edit-link',
	'group',
	'ungroup',
] as const

const AM: Partial<Record<State, string>> = {
	empty: 'D D D D D D D H',
	one: 'D D D E E E D H', // edit-link: a geo shape has a url prop
	two: 'E D D E E D E H',
	three: 'E E E E E D E H',
	lockedPair: 'D D D D D D D H',
	group: 'D D D E E D H E',
	boundArrow: 'E E D E E D D H', // group: an arrow bound outside the selection blocks it
	twoInHand: 'D D D D D D D H',
	groupWithLocked: 'D D D E E D H E', // group needs 2 unlocked shapes, so Ungroup shows
	lockedGroup: 'D D D D D D D H', // a locked group can't be ungrouped, so Group shows
	lockedThree: 'D D D D D D D H', // stack: locked shapes don't count
	groupInHand: 'D D D D D D D H', // ungroup needs the select tool, so Group shows
}

describe('toolbar actions menu gating', () => {
	it.each(Object.keys(AM) as State[])('%s', async (state) => {
		const editor = await renderWith(
			<TldrawUiToolbar label="test">
				<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
					<DefaultActionsMenuContent />
				</TldrawUiMenuContextProvider>
			</TldrawUiToolbar>
		)
		applyState(editor, state)
		expect(readGates('actions-menu', AM_IDS)).toEqual(expected(AM_IDS, AM[state]))
	})
})

/* ------------------------------- quick actions ------------------------------ */

const QA_IDS = ['delete', 'duplicate'] as const

const QA: Partial<Record<State, string>> = {
	empty: 'D D',
	one: 'E E',
	lockedPair: 'D D',
	twoInHand: 'D D',
}

describe('quick actions gating', () => {
	it.each(Object.keys(QA) as State[])('%s', async (state) => {
		const editor = await renderWith(
			<TldrawUiToolbar label="test">
				<TldrawUiMenuContextProvider type="small-icons" sourceId="quick-actions">
					<DefaultQuickActionsContent />
				</TldrawUiMenuContextProvider>
			</TldrawUiToolbar>
		)
		applyState(editor, state)
		expect(readGates('quick-actions', QA_IDS)).toEqual(expected(QA_IDS, QA[state]))
	})
})

/* ------------------------------- context menu ------------------------------- */

// The context menu hides disabled items, so every cell is hidden or enabled.
const CM_IDS = [
	'group',
	'ungroup',
	'duplicate',
	'toggle-lock',
	'cut',
	'copy',
	'delete',
	'select-all',
	'align-left',
	'distribute-horizontal',
	'flip-horizontal',
	'stack-horizontal',
	'bring-to-front',
] as const
const CM_SUBMENUS = ['edit', 'arrange', 'reorder'] as const

const CM_COLUMNS = [...CM_IDS, ...CM_SUBMENUS.map((id) => `sub:${id}`)]

// twoInHand and groupInHand are left out: the context menu only opens through the select tool.
const CM: Partial<Record<State, string>> = {
	empty: 'H H H H H H H H H H H H H H H H',
	one: 'H H E E E E E E H H E H E E E E',
	two: 'E H E E E E E E E H E H E E E E',
	three: 'E H E E E E E E E E E E E E E E',
	lockedPair: 'H H H E H E H E H H H H H E H H', // group: needs 2 unlocked shapes
	group: 'H E E E E E E E H H E H E E E E',
	boundArrow: 'H H E E E E E E E E E H E E E E',
	readonly: 'H H H H H E H E H H H H H H H H',
	lockedGroup: 'H H H E H E H E H H H H H E H H', // ungroup, flip: skip a locked group
	lockedThree: 'H H H E H E H E H H H H H E H H', // group: needs 2 unlocked shapes
}

describe('context menu gating', () => {
	it.each(Object.keys(CM) as State[])('%s', async (state) => {
		const editor = await renderWith()
		applyState(editor, state)
		const selected = editor.getSelectedShapeIds()
		fireEvent.contextMenu(await screen.findByTestId('canvas'))
		await screen.findByTestId('context-menu')
		// Opening must not have changed what we're asserting about.
		expect(editor.getSelectedShapeIds()).toEqual(selected)
		const subs = Object.fromEntries(
			CM_SUBMENUS.map((id) => [`sub:${id}`, submenuTrigger('context-menu', id)])
		)
		for (const id of CM_SUBMENUS) {
			if (subs[`sub:${id}`] === 'enabled')
				act(() => editor.menus.addOpenMenu(`context-menu-sub.${id}`))
		}
		expect({ ...readGates('context-menu', CM_IDS), ...subs }).toEqual(
			expected(CM_COLUMNS, CM[state])
		)
	})
})

/* --------------------------------- main menu -------------------------------- */

const MM_IDS = [
	'cut',
	'copy',
	'duplicate',
	'delete',
	'group',
	'ungroup',
	'toggle-lock',
	'unlock-all',
	'select-all',
	'zoom-to-fit',
	'zoom-to-selection',
	'export-all-as-svg',
] as const

// twoInHand is left out: changing tools closes open menus.
const MM: Partial<Record<State, string>> = {
	empty: 'D D H D H H H D D D D D', // export-all: disabled on an empty page
	one: 'E E E E H H E D E E E E', // unlock-all: nothing is locked
	lockedPair: 'D E H D H H E E E E E E', // group: needs 2 unlocked shapes
	group: 'E E E E H E E D E E E E', // unlock-all: nothing is locked
}

describe('main menu gating', () => {
	it.each(Object.keys(MM) as State[])('%s', async (state) => {
		const editor = await renderWith()
		applyState(editor, state)
		act(() => editor.menus.addOpenMenu('main menu'))
		await screen.findByTestId('main-menu-sub.edit-button')
		// Radix keeps one submenu open at a time, so read each in turn and merge.
		const merged = readGates('main-menu', MM_IDS)
		for (const sub of ['edit', 'view', 'export-all-as']) {
			const trigger = await screen.findByTestId(`main-menu-sub.${sub}-button`)
			act(() => trigger.focus())
			fireEvent.keyDown(trigger, { key: 'ArrowRight' })
			await screen.findByTestId(`main-menu-sub.${sub}-content`)
			for (const [id, gate] of Object.entries(readGates('main-menu', MM_IDS))) {
				if (gate !== 'hidden') merged[id] = gate
			}
		}
		expect(merged).toEqual(expected(MM_IDS, MM[state]))
	})
})
