import { act, screen } from '@testing-library/react'
import { Editor, TLPermission, TLShapeId, atom, createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const ALL: TLPermission[] = [
	'tl:shape:create',
	'tl:shape:update',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:update',
	'tl:page:delete',
]
const granted = atom<TLPermission[]>('granted', ALL)
const grant = (...permissions: TLPermission[]) => act(() => granted.set(permissions))
const without = (...permissions: TLPermission[]) => ALL.filter((p) => !permissions.includes(p))
const can = (permission: TLPermission) => granted.get().includes(permission)

let editor: Editor
let actions: TLUiActionsContextType
let a: TLShapeId
let b: TLShapeId

function Capturer() {
	const current = useActions()
	useEffect(() => {
		actions = current
	}, [current])
	return null
}

beforeEach(async () => {
	granted.set(ALL)
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				can={can}
				canChangeRecord={(change) => {
					const record = change.next ?? change.prev
					return record.typeName !== 'shape' || can(`tl:shape:${change.type}`)
				}}
			>
				<Capturer />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
	a = createShapeId('a')
	b = createShapeId('b')
	act(() => {
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0 },
			{ id: b, type: 'geo', x: 300, y: 0 },
		])
		editor.select(a, b)
	})
})

afterEach(() => {
	editor?.dispose()
})

const IDS = [
	'delete',
	'cut',
	'duplicate',
	'group',
	'frame-selection',
	'flatten-to-image',
	'move-to-new-page',
	'toggle-lock',
	'bring-to-front',
] as const

function readEnabled() {
	return Object.fromEntries(IDS.map((id) => [id, actions[id].isEnabled?.(editor) ?? true]))
}

const ALL_ON = Object.fromEntries(IDS.map((id) => [id, true]))
const off = (...ids: (typeof IDS)[number][]) => ({
	...ALL_ON,
	...Object.fromEntries(ids.map((id) => [id, false])),
})

describe('actions on the selection', () => {
	it('are all on with every permission', () => {
		expect(readEnabled()).toEqual(ALL_ON)
	})

	it('without tl:shape:delete: no delete, cut, or anything that replaces the shapes', () => {
		grant(...without('tl:shape:delete'))
		expect(readEnabled()).toEqual(off('delete', 'cut', 'flatten-to-image', 'move-to-new-page'))
	})

	it('without tl:shape:create: nothing that makes a shape', () => {
		grant(...without('tl:shape:create'))
		expect(readEnabled()).toEqual(
			off('duplicate', 'group', 'frame-selection', 'flatten-to-image', 'move-to-new-page')
		)
	})

	it('without tl:shape:update: nothing at all', () => {
		grant(...without('tl:shape:update'))
		expect(readEnabled()).toEqual(off(...IDS))
	})
})

describe('ungroup and remove frame', () => {
	it('need tl:shape:delete, since the group or frame goes away', () => {
		act(() => editor.groupShapes([a, b]))
		expect(actions['ungroup'].isEnabled?.(editor)).toBe(true)

		grant(...without('tl:shape:delete'))
		expect(actions['ungroup'].isEnabled?.(editor)).toBe(false)
	})
})

describe('unlock all', () => {
	it('needs tl:shape:update', () => {
		act(() => editor.toggleLock([a]))
		expect(actions['unlock-all'].isEnabled?.(editor)).toBe(true)

		grant(...without('tl:shape:update'))
		expect(actions['unlock-all'].isEnabled?.(editor)).toBe(false)
	})
})

describe('the style panel', () => {
	const isShown = () =>
		!!(screen.queryByTestId('style.panel') ?? screen.queryByTestId('mobile-styles.button'))

	it('is shown while shapes can be created or updated, since it styles both', () => {
		expect(isShown()).toBe(true)
		grant(...without('tl:shape:update'))
		expect(isShown()).toBe(true)
		grant(...without('tl:shape:create'))
		expect(isShown()).toBe(true)
	})

	it('is not shown when neither is possible', () => {
		grant(...without('tl:shape:create', 'tl:shape:update'))
		expect(isShown()).toBe(false)

		grant(...ALL)
		expect(isShown()).toBe(true)
	})
})
