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
type State = 'empty' | 'one' | 'two' | 'three' | 'lockedPair' | 'group' | 'boundArrow' | 'twoInHand'

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	arrow: createShapeId('arrow'),
	group: createShapeId('group'),
}

function applyState(editor: Editor, state: State) {
	act(() => {
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

const AM: Record<State, Record<(typeof AM_IDS)[number], Gate>> = {
	empty: {
		'align-left': 'disabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'disabled',
		'rotate-cw': 'disabled',
		'edit-link': 'disabled',
		group: 'disabled',
		ungroup: 'hidden',
	},
	one: {
		'align-left': 'disabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'enabled',
		'rotate-cw': 'enabled',
		'edit-link': 'enabled' /* geo has a url prop */,
		group: 'disabled',
		ungroup: 'hidden',
	},
	two: {
		'align-left': 'enabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'enabled',
		'rotate-cw': 'enabled',
		'edit-link': 'disabled',
		group: 'enabled',
		ungroup: 'hidden',
	},
	three: {
		'align-left': 'enabled',
		'distribute-horizontal': 'enabled',
		'stack-horizontal': 'enabled',
		'bring-to-front': 'enabled',
		'rotate-cw': 'enabled',
		'edit-link': 'disabled',
		group: 'enabled',
		ungroup: 'hidden',
	},
	lockedPair: {
		'align-left': 'disabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'disabled',
		'rotate-cw': 'disabled',
		'edit-link': 'disabled',
		group: 'disabled',
		ungroup: 'hidden',
	},
	group: {
		'align-left': 'disabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'enabled',
		'rotate-cw': 'enabled',
		'edit-link': 'disabled',
		group: 'hidden',
		ungroup: 'enabled',
	},
	boundArrow: {
		'align-left': 'enabled',
		'distribute-horizontal': 'enabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'enabled',
		'rotate-cw': 'enabled',
		'edit-link': 'disabled',
		group: 'disabled', // changed: arrow bound outside the selection blocks group
		ungroup: 'hidden',
	},
	twoInHand: {
		'align-left': 'disabled',
		'distribute-horizontal': 'disabled',
		'stack-horizontal': 'disabled',
		'bring-to-front': 'disabled',
		'rotate-cw': 'disabled',
		'edit-link': 'disabled',
		group: 'disabled',
		ungroup: 'hidden',
	},
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
		expect(readGates('actions-menu', AM_IDS)).toEqual(AM[state])
	})
})

/* ------------------------------- quick actions ------------------------------ */

const QA_IDS = ['delete', 'duplicate'] as const

const QA: Record<State, Record<(typeof QA_IDS)[number], Gate>> = {
	empty: { delete: 'disabled', duplicate: 'disabled' },
	one: { delete: 'enabled', duplicate: 'enabled' },
	two: { delete: 'enabled', duplicate: 'enabled' },
	three: { delete: 'enabled', duplicate: 'enabled' },
	lockedPair: { delete: 'disabled', duplicate: 'disabled' },
	group: { delete: 'enabled', duplicate: 'enabled' },
	boundArrow: { delete: 'enabled', duplicate: 'enabled' },
	twoInHand: { delete: 'disabled', duplicate: 'disabled' },
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
		expect(readGates('quick-actions', QA_IDS)).toEqual(QA[state])
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

type CmRow = Record<(typeof CM_IDS)[number] | `sub:${(typeof CM_SUBMENUS)[number]}`, Gate>

// twoInHand is left out: the context menu only opens through the select tool.
const CM: Record<Exclude<State, 'twoInHand'>, CmRow> = {
	empty: {
		group: 'hidden',
		ungroup: 'hidden',
		duplicate: 'hidden',
		'toggle-lock': 'hidden',
		cut: 'hidden',
		copy: 'hidden',
		delete: 'hidden',
		'select-all': 'hidden',
		'align-left': 'hidden',
		'distribute-horizontal': 'hidden',
		'flip-horizontal': 'hidden',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'hidden',
		'sub:edit': 'hidden',
		'sub:arrange': 'hidden',
		'sub:reorder': 'hidden',
	},
	one: {
		group: 'hidden',
		ungroup: 'hidden',
		duplicate: 'enabled',
		'toggle-lock': 'enabled',
		cut: 'enabled',
		copy: 'enabled',
		delete: 'enabled',
		'select-all': 'enabled',
		'align-left': 'hidden',
		'distribute-horizontal': 'hidden',
		'flip-horizontal': 'enabled',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'enabled',
		'sub:edit': 'enabled',
		'sub:arrange': 'enabled',
		'sub:reorder': 'enabled',
	},
	two: {
		group: 'enabled',
		ungroup: 'hidden',
		duplicate: 'enabled',
		'toggle-lock': 'enabled',
		cut: 'enabled',
		copy: 'enabled',
		delete: 'enabled',
		'select-all': 'enabled',
		'align-left': 'enabled',
		'distribute-horizontal': 'hidden',
		'flip-horizontal': 'enabled',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'enabled',
		'sub:edit': 'enabled',
		'sub:arrange': 'enabled',
		'sub:reorder': 'enabled',
	},
	three: {
		group: 'enabled',
		ungroup: 'hidden',
		duplicate: 'enabled',
		'toggle-lock': 'enabled',
		cut: 'enabled',
		copy: 'enabled',
		delete: 'enabled',
		'select-all': 'enabled',
		'align-left': 'enabled',
		'distribute-horizontal': 'enabled',
		'flip-horizontal': 'enabled',
		'stack-horizontal': 'enabled',
		'bring-to-front': 'enabled',
		'sub:edit': 'enabled',
		'sub:arrange': 'enabled',
		'sub:reorder': 'enabled',
	},
	lockedPair: {
		group: 'hidden', // changed: group needs 2 unlocked shapes
		ungroup: 'hidden',
		duplicate: 'hidden',
		'toggle-lock': 'enabled',
		cut: 'hidden',
		copy: 'enabled',
		delete: 'hidden',
		'select-all': 'enabled',
		'align-left': 'hidden',
		'distribute-horizontal': 'hidden',
		'flip-horizontal': 'hidden',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'hidden',
		'sub:edit': 'enabled',
		'sub:arrange': 'hidden',
		'sub:reorder': 'hidden',
	},
	group: {
		group: 'hidden',
		ungroup: 'enabled',
		duplicate: 'enabled',
		'toggle-lock': 'enabled',
		cut: 'enabled',
		copy: 'enabled',
		delete: 'enabled',
		'select-all': 'enabled',
		'align-left': 'hidden',
		'distribute-horizontal': 'hidden',
		'flip-horizontal': 'enabled',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'enabled',
		'sub:edit': 'enabled',
		'sub:arrange': 'enabled',
		'sub:reorder': 'enabled',
	},
	boundArrow: {
		group: 'hidden',
		ungroup: 'hidden',
		duplicate: 'enabled',
		'toggle-lock': 'enabled',
		cut: 'enabled',
		copy: 'enabled',
		delete: 'enabled',
		'select-all': 'enabled',
		'align-left': 'enabled',
		'distribute-horizontal': 'enabled',
		'flip-horizontal': 'enabled',
		'stack-horizontal': 'hidden',
		'bring-to-front': 'enabled',
		'sub:edit': 'enabled',
		'sub:arrange': 'enabled',
		'sub:reorder': 'enabled',
	},
}

describe('context menu gating', () => {
	it.each(Object.keys(CM) as (keyof typeof CM)[])('%s', async (state) => {
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
		expect({ ...readGates('context-menu', CM_IDS), ...subs }).toEqual(CM[state])
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

type MmRow = Record<(typeof MM_IDS)[number], Gate>

// twoInHand is left out: changing tools closes open menus.
const MM: Record<'empty' | 'one' | 'lockedPair' | 'group', MmRow> = {
	empty: {
		cut: 'disabled',
		copy: 'disabled',
		duplicate: 'hidden',
		delete: 'disabled',
		group: 'hidden',
		ungroup: 'hidden',
		'toggle-lock': 'hidden',
		'unlock-all': 'disabled',
		'select-all': 'disabled',
		'zoom-to-fit': 'disabled',
		'zoom-to-selection': 'disabled',
		'export-all-as-svg': 'disabled', // changed: export all disabled on an empty page
	},
	one: {
		cut: 'enabled',
		copy: 'enabled',
		duplicate: 'enabled',
		delete: 'enabled',
		group: 'hidden',
		ungroup: 'hidden',
		'toggle-lock': 'enabled',
		'unlock-all': 'disabled', // changed: nothing locked
		'select-all': 'enabled',
		'zoom-to-fit': 'enabled',
		'zoom-to-selection': 'enabled',
		'export-all-as-svg': 'enabled',
	},
	lockedPair: {
		cut: 'disabled',
		copy: 'enabled',
		duplicate: 'hidden',
		delete: 'disabled',
		group: 'hidden', // changed: group needs 2 unlocked shapes
		ungroup: 'hidden',
		'toggle-lock': 'enabled',
		'unlock-all': 'enabled',
		'select-all': 'enabled',
		'zoom-to-fit': 'enabled',
		'zoom-to-selection': 'enabled',
		'export-all-as-svg': 'enabled',
	},
	group: {
		cut: 'enabled',
		copy: 'enabled',
		duplicate: 'enabled',
		delete: 'enabled',
		group: 'hidden',
		ungroup: 'enabled',
		'toggle-lock': 'enabled',
		'unlock-all': 'disabled', // changed: nothing locked
		'select-all': 'enabled',
		'zoom-to-fit': 'enabled',
		'zoom-to-selection': 'enabled',
		'export-all-as-svg': 'enabled',
	},
}

describe('main menu gating', () => {
	it.each(Object.keys(MM) as (keyof typeof MM)[])('%s', async (state) => {
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
		expect(merged).toEqual(MM[state])
	})
})
