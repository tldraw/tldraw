import { atom, createShapeId, PageRecordType, TLRecordWrite, TLShape } from '@tldraw/editor'
import { vi } from 'vitest'
import {
	canCreatePage,
	canDeletePage,
	canUpdatePage,
} from '../../lib/ui/components/PageMenu/edit-pages-shared'
import {
	canApplyToUnlockedSelection,
	canCreateShapeOfType,
	canWriteSelection,
	hasLockedShapesOnPage,
} from '../../lib/ui/context/action-predicates'
import { isActionRunnable, isReadonlyOk, isToolAvailable } from '../../lib/ui/context/action-state'
import { TLUiActionItem } from '../../lib/ui/context/actions'
import { TLUiToolItem } from '../../lib/ui/hooks/useTools'
import { TestEditor } from '../TestEditor'

const mine = createShapeId('mine')
const theirs = createShapeId('theirs')

// Shapes are written by their owner, and only comments may be created in a readonly editor
const me = atom('me', 'alice')
const blocksShapeCreates = atom('blocks shape creates', false)
function canWrite({ type, record }: TLRecordWrite) {
	if (record.typeName === 'page') return type !== 'delete'
	if (record.typeName !== 'shape') return true
	if (type === 'create') return !blocksShapeCreates.get()
	return (record as TLShape).meta.owner === me.get()
}

let editor: TestEditor

beforeEach(() => {
	me.set('alice')
	blocksShapeCreates.set(false)
	editor = new TestEditor({ canWrite })
	editor.store.mergeRemoteChanges(() => {
		editor.createShapes([
			{ id: mine, type: 'geo', x: 0, meta: { owner: 'alice' } },
			{ id: theirs, type: 'geo', x: 200, meta: { owner: 'bob' } },
		])
	})
})

const tool = (id: string, readonlyOk?: TLUiToolItem['readonlyOk']) =>
	({ id, label: id, icon: 'tool-pointer', onSelect() {}, readonlyOk }) as TLUiToolItem

describe('selection actions', () => {
	it('are disabled while the selection holds a shape the person cannot write', () => {
		editor.select(mine)
		expect(canWriteSelection(editor)).toBe(true)
		expect(canApplyToUnlockedSelection(editor, 1)).toBe(true)

		editor.select(mine, theirs)
		expect(canWriteSelection(editor)).toBe(false)
		expect(canApplyToUnlockedSelection(editor, 1)).toBe(false)
	})

	it('update when the canWrite answer changes', () => {
		editor.select(theirs)
		expect(canWriteSelection(editor)).toBe(false)
		me.set('bob')
		expect(canWriteSelection(editor)).toBe(true)
	})

	it('check the children of a selected frame', () => {
		const frame = createShapeId('frame')
		editor.store.mergeRemoteChanges(() => {
			editor.createShapes([
				{ id: frame, type: 'frame', x: 500, meta: { owner: 'alice' } },
				{ id: createShapeId('child'), type: 'geo', parentId: frame, meta: { owner: 'bob' } },
			])
		})
		editor.select(frame)
		expect(canWriteSelection(editor)).toBe(false)
	})

	it('cannot unlock a locked shape the person cannot write', () => {
		editor.store.mergeRemoteChanges(() => {
			editor.updateShapes([{ id: theirs, type: 'geo', isLocked: true }])
		})
		expect(hasLockedShapesOnPage(editor)).toBe(false)
		me.set('bob')
		expect(hasLockedShapesOnPage(editor)).toBe(true)
	})
})

describe('tools', () => {
	it('hide a shape tool when the person cannot create that shape', () => {
		expect(canCreateShapeOfType(editor, 'geo')).toBe(true)
		expect(isToolAvailable(editor, tool('geo'))).toBe(true)
		blocksShapeCreates.set(true)
		expect(canCreateShapeOfType(editor, 'geo')).toBe(false)
		expect(isToolAvailable(editor, tool('geo'))).toBe(false)
		expect(isToolAvailable(editor, tool('draw'))).toBe(false)
		// a tool that is not named after a shape type stays
		expect(isToolAvailable(editor, tool('select', true))).toBe(true)
		expect(isToolAvailable(editor, tool('comment'))).toBe(true)
	})

	it('show in readonly mode only when readonlyOk allows it', () => {
		editor.updateInstanceState({ isReadonly: true })
		expect(isToolAvailable(editor, tool('comment'))).toBe(false)
		expect(isToolAvailable(editor, tool('comment', true))).toBe(true)
		const commenter = atom('commenter', false)
		const comment = tool('comment', () => commenter.get())
		expect(isToolAvailable(editor, comment)).toBe(false)
		commenter.set(true)
		expect(isToolAvailable(editor, comment)).toBe(true)
	})
})

describe('readonlyOk as a function', () => {
	it('decides whether an action runs in readonly mode', () => {
		const allowed = atom('allowed', false)
		const action: TLUiActionItem = { id: 'x', readonlyOk: () => allowed.get(), onSelect() {} }
		editor.updateInstanceState({ isReadonly: true })
		expect(isActionRunnable(editor, action)).toBe(false)
		allowed.set(true)
		expect(isActionRunnable(editor, action)).toBe(true)
	})

	it('reads a function that throws as false', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		expect(
			isReadonlyOk(editor, () => {
				throw new Error('nope')
			})
		).toBe(false)
		expect(spy).toHaveBeenCalled()
		spy.mockRestore()
	})
})

describe('Editor.canWrite in readonly mode', () => {
	it('allows nothing without the option', () => {
		const plain = new TestEditor()
		const shape = { id: createShapeId(), typeName: 'shape' } as TLShape
		expect(plain.canWrite({ type: 'create', record: shape })).toBe(true)
		plain.updateInstanceState({ isReadonly: true })
		expect(plain.canWrite({ type: 'create', record: shape })).toBe(false)
	})

	it('leaves the answer to the option', () => {
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.canWrite({ type: 'update', record: editor.getShape(mine)! })).toBe(true)
		expect(editor.canWrite({ type: 'update', record: editor.getShape(theirs)! })).toBe(false)
	})
})

describe('page menu', () => {
	it('asks canWrite for each page write', () => {
		const page = editor.getCurrentPageId()
		expect(canCreatePage(editor)).toBe(true)
		expect(canUpdatePage(editor, page)).toBe(true)
		expect(canDeletePage(editor, page)).toBe(false)
		expect(canUpdatePage(editor, PageRecordType.createId('missing'))).toBe(false)
	})
})
