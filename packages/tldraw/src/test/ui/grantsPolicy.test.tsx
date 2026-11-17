import { act } from '@testing-library/react'
import {
	atom,
	computed,
	createShapeId,
	Editor,
	PageRecordType,
	TLRecord,
	TLShape,
	TLWriteRule,
	TLWriteRuleSession,
} from '@tldraw/editor'
import { createGrantsPolicy } from '@tldraw/permissions'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { canDeleteShape, canUpdateShape } from '../../lib/tools/SelectTool/selectHelpers'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TLUiToolsContextType, useTools } from '../../lib/ui/hooks/useTools'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// The spec's two examples, end to end: grants and a shared policy, no UI code for the first.

const pageA = PageRecordType.createId('A')
const pageB = PageRecordType.createId('B')
const onA = createShapeId('onA')
const onB = createShapeId('onB')

// requires adds page:edit to every shape action, and tl:* doesn't cover a name outside tl:
const TEACHER = ['tl:*', 'page:edit']
const STUDENT = ['tl:shape:*', `page:edit@${pageA}`]

const sessionFor = (userId: string, permissions: readonly string[]): TLWriteRuleSession => ({
	sessionId: 'local',
	userId,
	meta: undefined,
	access: { document: 'write', objects: 'write' },
	permissions,
})

let editor: Editor
let tools: TLUiToolsContextType
let actions: TLUiActionsContextType

function Capturer() {
	const t = useTools()
	const a = useActions()
	useEffect(() => {
		tools = t
		actions = a
	}, [t, a])
	return null
}

afterEach(() => {
	editor?.dispose()
})

/** Pages A and B with a shape on each, made as the teacher. */
function seed() {
	act(() => {
		editor.createPage({ id: pageA, name: 'A' })
		editor.createPage({ id: pageB, name: 'B' })
		editor.createShapes([{ id: onA, type: 'geo', parentId: pageA, x: 0, y: 0 }])
		editor.createShapes([{ id: onB, type: 'geo', parentId: pageB, x: 0, y: 0 }])
	})
}

describe('assigned pages', () => {
	const policy = createGrantsPolicy({
		requires: {
			'tl:shape:create': ['tl:shape:create', 'page:edit'],
			'tl:shape:update': ['tl:shape:update', 'page:edit'],
			'tl:shape:delete': ['tl:shape:delete', 'page:edit'],
		},
	})
	const permissions = atom<readonly string[]>('permissions', TEACHER)
	const refusals: string[] = []

	beforeEach(async () => {
		permissions.set(TEACHER)
		refusals.length = 0
		const result = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={onMount}
					authorize={{ ...policy, getSession: () => sessionFor('sam', permissions.get()) }}
				>
					<Capturer />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		editor = result.editor
		editor.on('refused', (r) => refusals.push(r.reason))
		seed()
		act(() => permissions.set(STUDENT))
	})

	const SHAPE_TOOLS = ['draw', 'rectangle', 'arrow', 'line', 'frame', 'text', 'note', 'highlight']
	const enabledTools = () => SHAPE_TOOLS.filter((id) => tools[id].isEnabled!(editor))

	it('turns the shape tools on on page A and off on page B', () => {
		act(() => editor.setCurrentPage(pageA))
		expect(enabledTools()).toEqual(SHAPE_TOOLS)
		act(() => editor.setCurrentPage(pageB))
		expect(enabledTools()).toEqual([])
	})

	it('follows the current page and the grants reactively', () => {
		const drawOn = computed('draw on', () => tools.draw.isEnabled!(editor))
		act(() => editor.setCurrentPage(pageA))
		expect(drawOn.get()).toBe(true)
		act(() => editor.setCurrentPage(pageB))
		expect(drawOn.get()).toBe(false)
		act(() => permissions.set([...STUDENT, `page:edit@${pageB}`]))
		expect(drawOn.get()).toBe(true)
		act(() => permissions.set(STUDENT))
		expect(drawOn.get()).toBe(false)
	})

	it('turns off the selected-shape checks on page B', () => {
		act(() => {
			editor.setCurrentPage(pageB)
			editor.select(onB)
		})
		const shape = editor.getShape(onB)!
		expect({
			update: canUpdateShape(editor, shape),
			delete: canDeleteShape(editor, shape),
			deleteAction: actions['delete'].isEnabled!(editor),
			edit: editor.canEditShape(shape),
		}).toEqual({ update: false, delete: false, deleteAction: false, edit: false })

		act(() => {
			editor.setCurrentPage(pageA)
			editor.select(onA)
		})
		expect(canUpdateShape(editor, editor.getShape(onA)!)).toBe(true)
		expect(actions['delete'].isEnabled!(editor)).toBe(true)
	})

	it('draws on page A, and refuses a shape pushed onto page B with the typed action', () => {
		const drawn = createShapeId('drawn')
		act(() => {
			// a drawing gesture: create, then update on every drag frame
			editor.createShapes([{ id: drawn, type: 'geo', parentId: pageA }])
			editor.updateShape({ id: drawn, type: 'geo', x: 100 })
		})
		expect(editor.getShape(drawn)!.x).toBe(100)
		expect(refusals).toEqual([])

		const sneaky = createShapeId('sneaky')
		act(() => editor.createShapes([{ id: sneaky, type: 'geo', parentId: pageB }]))
		expect(editor.getShape(sneaky)).toBeUndefined()
		expect(refusals).toEqual(['Needs tl:shape:create:geo'])
	})

	it('refuses moving a shape from B to A: no page:edit on B', () => {
		act(() => editor.reparentShapes([onB], pageA))
		expect(editor.getShape(onB)!.parentId).toBe(pageB)
		expect(refusals).toEqual(['Needs tl:shape:update:geo'])
	})

	it('with note grants only, turns on only the note tool, on page A', () => {
		act(() =>
			permissions.set(['tl:shape:create:note', 'tl:shape:update:note', `page:edit@${pageA}`])
		)
		act(() => editor.setCurrentPage(pageA))
		expect(enabledTools()).toEqual(['note'])
		act(() => editor.setCurrentPage(pageB))
		expect(enabledTools()).toEqual([])
	})
})

describe('only your own shapes', () => {
	const isMine = (shape: TLShape, userId: string | null) => shape.meta.ownerId === userId

	const ownershipRule: TLWriteRule<TLRecord> = ({ session, changes }) => {
		for (const { prev, next } of changes) {
			// prev: touch only what's yours. next: no forged or transferred owner.
			for (const shape of [prev, next]) {
				if (shape?.typeName === 'shape' && !isMine(shape, session.userId)) {
					return { reason: 'not yours', ids: [shape.id] }
				}
			}
		}
		return null
	}
	const policy = createGrantsPolicy({ rules: [ownershipRule] })
	const permissions = atom<readonly string[]>('permissions', ['tl:*'])
	const refusals: string[] = []
	const alicesShape = createShapeId('alices')
	const bobsShape = createShapeId('bobs')

	beforeEach(async () => {
		permissions.set(['tl:*'])
		refusals.length = 0
		const result = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={(editor) => {
						editor.getInitialMetaForShape = () => ({ ownerId: 'alice' })
						onMount(editor)
					}}
					authorize={{ ...policy, getSession: () => sessionFor('alice', permissions.get()) }}
					isChangePermitted={(change) => {
						const record = change.prev ?? change.next
						return record.typeName !== 'shape' || isMine(record, 'alice')
					}}
				>
					<Capturer />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		editor = result.editor
		editor.on('refused', (r) => refusals.push(r.reason))
		act(() => {
			editor.createShapes([{ id: alicesShape, type: 'geo', x: 0, y: 0 }])
			editor.store.mergeRemoteChanges(() =>
				editor.createShapes([
					{ id: bobsShape, type: 'geo', x: 300, y: 0, meta: { ownerId: 'bob' } },
				])
			)
		})
	})

	it('offers changes to your shapes only', () => {
		expect({
			mine: canUpdateShape(editor, editor.getShape(alicesShape)!),
			bobs: canUpdateShape(editor, editor.getShape(bobsShape)!),
			deleteBobs: canDeleteShape(editor, editor.getShape(bobsShape)!),
		}).toEqual({ mine: true, bobs: false, deleteBobs: false })
	})

	it("refuses a change to someone else's shape with the rule's reason", () => {
		act(() => editor.updateShape({ id: bobsShape, type: 'geo', x: 500 }))
		expect(editor.getShape(bobsShape)!.x).toBe(300)
		expect(refusals).toEqual(['not yours'])
	})

	it('keeps the grants as the ceiling: the callback narrows, it never widens', () => {
		act(() => permissions.set(['tl:page:*']))
		expect(canUpdateShape(editor, editor.getShape(alicesShape)!)).toBe(false)
		expect(tools.draw.isEnabled!(editor)).toBe(false)
		act(() => editor.updateShape({ id: alicesShape, type: 'geo', x: 50 }))
		expect(refusals).toEqual(['Needs tl:shape:update:geo'])
	})
})
