import { atom, computed } from '@tldraw/editor'
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
