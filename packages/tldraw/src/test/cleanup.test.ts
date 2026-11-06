import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { getArrowBindings } from '../lib/shapes/arrow/shared'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),
	group2: createShapeId('group2'),
	group3: createShapeId('group3'),
	arrow1: createShapeId('arrow1'),
	arrow2: createShapeId('arrow2'),
	arrow3: createShapeId('arrow3'),
}

beforeEach(() => {
	editor = new TestEditor()
})

function arrow() {
	return editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape
}

function bindings() {
	return getArrowBindings(editor, arrow())
}

describe('restoring bound arrows', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 200, y: 0 },
		])
		// create arrow from box1 to box2
		editor
			.setCurrentTool('arrow')
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(250, 50)
			.pointerUp()
	})

	it('removes bound arrows on delete, restores them on undo but only when change was done by user', () => {
		editor.markHistoryStoppingPoint('deleting')
		editor.deleteShapes([ids.box2])
		expect(bindings().end).toBeUndefined()
		editor.undo()
		expect(bindings().end).toBeDefined()
		editor.redo()
		expect(bindings().end).toBeUndefined()
	})

	it('removes / restores multiple bindings', () => {
		editor.markHistoryStoppingPoint('deleting')
		expect(bindings().start).toBeDefined()
		expect(bindings().end).toBeDefined()

		editor.deleteShapes([ids.box1, ids.box2])
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeUndefined()

		editor.undo()
		expect(bindings().start).toBeDefined()
		expect(bindings().end).toBeDefined()

		editor.redo()
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeUndefined()
	})
})

describe('restoring bound arrows multiplayer', () => {
	it('restores bound arrows after the shape was deleted by a different client', () => {
		editor.markHistoryStoppingPoint('before creating box shape')
		editor.createShapes([{ id: ids.box2, type: 'geo', x: 100, y: 0 }])

		editor.setCurrentTool('arrow').pointerMove(0, 50).pointerDown().pointerMove(150, 50).pointerUp()

		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeDefined()

		// Merge a change from a remote source that deletes box 2
		editor.store.mergeRemoteChanges(() => {
			editor.store.remove([ids.box2])
		})

		// box is gone
		expect(editor.getShape(ids.box2)).toBeUndefined()
		// arrow is still there, but without its binding
		expect(arrow()).not.toBeUndefined()
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeUndefined()

		editor.undo() // undo creating the arrow

		// arrow is gone too now
		expect(editor.getCurrentPageShapeIds().size).toBe(0)

		editor.redo() // redo creating the arrow

		expect(editor.getShape(ids.box2)).toBeUndefined()
		expect(arrow()).not.toBeUndefined()
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeUndefined()

		editor.undo() // undo creating arrow

		expect(editor.getCurrentPageShapeIds().size).toBe(0)

		editor.undo() // undo creating box

		expect(editor.getCurrentPageShapeIds().size).toBe(0)

		editor.redo() // redo creating box

		// box is back! arrow is gone
		expect(editor.getShape(ids.box2)).not.toBeUndefined()
		expect(arrow()).toBeUndefined()

		editor.redo() // redo creating arrow

		// box is back! arrow should be bound
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeDefined()
	})
})

describe('a local write veto and remote changes', () => {
	// A veto that blocks every delete, as an access layer might for a viewer. The store applies it
	// only to deletes someone asks for on this client.
	function vetoDeletes() {
		const seen: string[] = []
		const veto = (typeName: string, source: 'user' | 'remote') => {
			seen.push(`${typeName}:${source}:${editor.store.isReactingToRemoteChanges()}`)
			return false as const
		}
		const unregister = [
			editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) =>
				veto(shape.type, source)
			),
			editor.sideEffects.registerBeforeDeleteHandler('binding', (binding, source) =>
				veto(binding.type, source)
			),
		]
		return { seen, dispose: () => unregister.forEach((fn) => fn()) }
	}

	it('does not block the binding cleanup after a remote delete', () => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 200, y: 0 },
		])
		editor
			.setCurrentTool('arrow')
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(250, 50)
			.pointerUp()
		expect(bindings().end).toBeDefined()
		const veto = vetoDeletes()

		editor.store.mergeRemoteChanges(() => editor.store.remove([ids.box2]))

		expect(editor.getShape(ids.box2)).toBeUndefined()
		expect(bindings().start).toBeDefined()
		expect(bindings().end).toBeUndefined()
		veto.dispose()
	})

	// The group cleanup runs after the merge, in an operation-complete handler, so its source is
	// 'user' (this client pushes it).
	it('does not block the group cleanup after a remote delete', () => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 200, y: 0 },
		])
		editor.groupShapes([ids.box1, ids.box2], { groupId: ids.group1 })
		const veto = vetoDeletes()

		editor.store.mergeRemoteChanges(() => editor.store.remove([ids.box1, ids.box2]))

		expect(editor.getShape(ids.group1)).toBeUndefined()
		expect(veto.seen).toContain('group:user:true')
		veto.dispose()
	})

	it('still blocks a local delete', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const veto = vetoDeletes()

		editor.deleteShapes([ids.box1])

		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(veto.seen).toEqual(['geo:user:false'])
		veto.dispose()
	})

	it('cannot block the integrity repair after a local change deletes every page', () => {
		const dispose = editor.sideEffects.registerBeforeCreateHandler('page', () => false)

		editor.store.remove(editor.getPages().map((page) => page.id))
		editor.store.ensureStoreIsUsable()

		expect(editor.getPages()).toHaveLength(1)
		expect(editor.getCurrentPage()).toBeDefined()
		dispose()
	})
})
