import { createShapeId, RecordsDiff, TLRecord } from '@tldraw/editor'
import { createOrUpdateArrowBinding } from '../lib/shapes/arrow/shared'
import { TestEditor } from './TestEditor'

const ids = {
	box: createShapeId('box'),
	arrow: createShapeId('arrow'),
	other: createShapeId('other'),
}

it('reports an editor.run, an undo and a redo as one transaction each, side effects included', () => {
	const editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		{
			id: ids.arrow,
			type: 'arrow',
			x: 0,
			y: 0,
			props: { start: { x: 0, y: 0 }, end: { x: 150, y: 150 } },
		},
	])
	createOrUpdateArrowBinding(editor, ids.arrow, ids.box, {
		terminal: 'end',
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isExact: false,
		isPrecise: false,
		snap: 'none',
	})
	const bindingId = editor.getBindingsFromShape(ids.arrow, 'arrow')[0].id

	const commits: RecordsDiff<TLRecord>[] = []
	editor.store.onBeforeCommit((changes) => {
		const documentChanges = editor.store.filterChangesByScope(changes, 'document')
		if (documentChanges) commits.push(documentChanges)
	})

	editor.markHistoryStoppingPoint('delete')
	editor.run(() => {
		editor.createShapes([{ id: ids.other, type: 'geo' }])
		editor.deleteShapes([ids.box])
	})

	// the binding goes with the box through a side effect
	expect(commits).toHaveLength(1)
	expect(Object.keys(commits[0].added)).toEqual([ids.other])
	expect(Object.keys(commits[0].removed).sort()).toEqual([bindingId, ids.box].sort())

	editor.undo()
	editor.redo()
	expect(commits).toHaveLength(3)
})
