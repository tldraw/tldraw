import { TLAuthorize, TLPermission, atom, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { canDeleteShape, canUpdateShape } from '../lib/tools/SelectTool/selectHelpers'
import {
	canCreatePage,
	canDeletePage,
	canUpdatePage,
} from '../lib/ui/components/PageMenu/edit-pages-shared'
import {
	canDeleteSelection,
	canDuplicateSelection,
	getUnlockedSelectedShapes,
} from '../lib/ui/context/action-predicates'
import { TestEditor } from './TestEditor'

const ALL: TLPermission[] = [
	'tl:shape:create',
	'tl:shape:edit',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:edit',
	'tl:page:delete',
]

const granted = atom('granted', new Set<string>(ALL))
const authorize: TLAuthorize = { can: (permission) => granted.get().has(permission) }
const grant = (...permissions: TLPermission[]) => granted.set(new Set(permissions))

const ids = { box: createShapeId('box') }
let editor: TestEditor

beforeEach(() => {
	grant(...ALL)
	editor = new TestEditor({}, { authorize })
	editor.createShape({ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
	editor.select(ids.box)
})

describe('shape permissions in the UI', () => {
	it('canUpdateShape and canDeleteShape follow editor.can, locks and readonly', () => {
		const box = editor.getShape(ids.box)!
		expect(canUpdateShape(editor, box)).toBe(true)
		expect(canDeleteShape(editor, box)).toBe(true)

		grant('tl:shape:delete')
		expect(canUpdateShape(editor, box)).toBe(false)
		expect(canDeleteShape(editor, box)).toBe(true)
		expect(getUnlockedSelectedShapes(editor)).toEqual([])

		grant(...ALL)
		editor.updateInstanceState({ isReadonly: true })
		expect(canUpdateShape(editor, box)).toBe(false)
	})

	it('does not start a drag on a shape the user cannot edit', () => {
		grant('tl:shape:create')
		editor.pointerDown(50, 50, ids.box).pointerMove(150, 150).pointerUp()
		expect(editor.getShape(ids.box)).toMatchObject({ x: 0, y: 0 })
	})

	it('does not edit text in a shape the user cannot edit', () => {
		grant('tl:shape:create')
		expect(editor.canEditShape(editor.getShape(ids.box)!)).toBe(false)
	})

	it('the eraser skips shapes the user cannot delete', () => {
		grant('tl:shape:create', 'tl:shape:edit')
		editor.setCurrentTool('eraser')
		editor.pointerDown(50, 50).pointerUp()
		expect(editor.getShape(ids.box)).toBeDefined()
	})

	it('selection actions ask for the permission they need', () => {
		grant('tl:shape:edit')
		expect(canDeleteSelection(editor)).toBe(false)
		expect(canDuplicateSelection(editor)).toBe(false)
		grant('tl:shape:create', 'tl:shape:delete')
		expect(canDeleteSelection(editor)).toBe(true)
		expect(canDuplicateSelection(editor)).toBe(true)
	})

	it('does not handle external content without tl:shape:create', async () => {
		const handler = vi.fn()
		editor.registerExternalContentHandler('text', handler)
		grant('tl:shape:edit')
		await editor.putExternalContent({ type: 'text', text: 'hi' })
		expect(handler).not.toHaveBeenCalled()
		grant(...ALL)
		await editor.putExternalContent({ type: 'text', text: 'hi' })
		expect(handler).toHaveBeenCalled()
	})
})

describe('page permissions in the UI', () => {
	it('page menu checks follow editor.can', () => {
		const page = editor.getCurrentPage()
		grant('tl:page:edit')
		expect(canCreatePage(editor)).toBe(false)
		expect(canUpdatePage(editor, page)).toBe(true)
		expect(canDeletePage(editor, page)).toBe(false)
		// deleting a page with shapes also deletes the shapes
		grant('tl:page:delete')
		expect(canDeletePage(editor, page)).toBe(false)
		grant('tl:page:delete', 'tl:shape:delete')
		expect(canDeletePage(editor, page)).toBe(true)
	})
})
