import { atom, computed, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

it('allows everything when no rule is set', () => {
	const editor = new TestEditor()
	expect(editor.can('tl:shape:create')).toBe(true)
})

it('asks the rule, with the editor', () => {
	const asked: unknown[][] = []
	const editor = new TestEditor({
		can: (permission, editor) => {
			asked.push([permission, editor])
			return permission === 'tl:page:create'
		},
	})

	expect([editor.can('tl:page:create'), editor.can('tl:page:delete')]).toEqual([true, false])
	expect(asked).toEqual([
		['tl:page:create', editor],
		['tl:page:delete', editor],
	])
})

it('follows the rule when what it reads changes', () => {
	const granted = atom('granted', ['tl:page:create'])
	const editor = new TestEditor({ can: (permission) => granted.get().includes(permission) })
	const canDelete = computed('canDelete', () => editor.can('tl:page:delete'))

	expect(canDelete.get()).toBe(false)
	granted.set(['tl:page:delete'])
	expect(canDelete.get()).toBe(true)
})

describe('without tl:shape:create', () => {
	let editor: TestEditor
	beforeEach(() => {
		editor = new TestEditor({ can: (permission) => permission !== 'tl:shape:create' })
	})

	it('says no shapes can be created', () => {
		expect(editor.canCreateShapes([createShapeId()])).toBe(false)
	})

	it('does not create a text shape on double click', () => {
		editor.doubleClick(100, 100)
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(editor.getEditingShapeId()).toBe(null)
	})
})

it('gives a note no clone handles without tl:shape:create', () => {
	let canCreate = true
	const editor = new TestEditor({ can: (p) => p !== 'tl:shape:create' || canCreate })
	const id = createShapeId()
	editor.createShapes([{ id, type: 'note' }])
	expect(editor.getShapeHandles(id)!.length).toBeGreaterThan(0)

	canCreate = false
	const other = createShapeId()
	editor.createShapes([{ id: other, type: 'note', x: 500 }])
	expect(editor.getShapeHandles(other)).toEqual([])
})
