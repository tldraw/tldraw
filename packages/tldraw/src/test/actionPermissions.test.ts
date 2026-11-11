import { atom, createShapeId, TLPermission } from '@tldraw/editor'
import {
	canDeleteSelection,
	canUngroupSelection,
	hasUnlockedSelection,
} from '../lib/ui/context/action-predicates'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

// A host can pass `isPermitted` without a matching `isChangePermitted`; the named permission alone must then
// still turn the action off.

const granted = atom<TLPermission[]>('granted', [])

function setup() {
	granted.set(['tl:shape:create', 'tl:shape:update', 'tl:shape:delete'])
	const editor = new TestEditor({ isPermitted: (permission) => granted.get().includes(permission) })
	fakeLicense(editor)
	const a = createShapeId('a')
	const b = createShapeId('b')
	editor.createShapes([
		{ id: a, type: 'geo', x: 0, y: 0 },
		{ id: b, type: 'geo', x: 300, y: 0 },
	])
	editor.select(a, b)
	return editor
}

it('delete needs tl:shape:delete', () => {
	const editor = setup()
	expect(canDeleteSelection(editor)).toBe(true)
	granted.set(['tl:shape:update'])
	expect(canDeleteSelection(editor)).toBe(false)
})

it('ungroup needs tl:shape:update as well as delete', () => {
	const editor = setup()
	editor.groupShapes(editor.getSelectedShapeIds())
	expect(canUngroupSelection(editor)).toBe(true)
	granted.set(['tl:shape:delete'])
	expect(canUngroupSelection(editor)).toBe(false)
	granted.set(['tl:shape:update'])
	expect(canUngroupSelection(editor)).toBe(false)
})

it('actions that change the selection need tl:shape:update', () => {
	const editor = setup()
	expect(hasUnlockedSelection(editor, 1)).toBe(true)
	granted.set(['tl:shape:create', 'tl:shape:delete'])
	expect(hasUnlockedSelection(editor, 1)).toBe(false)
})
