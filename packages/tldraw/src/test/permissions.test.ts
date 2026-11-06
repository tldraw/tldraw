import {
	createShapeId,
	defaultAbilityRules,
	definePermissions,
	ownShapesOnly,
	stampOwner,
	TLPermissionDenial,
	TLRecord,
	toRichText,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

// The editor's half of transaction-level permissions: every `editor.run` is checked as one
// transaction before it commits, and a denied run leaves no trace.

const permissions = definePermissions<TLRecord>({
	rules: [...defaultAbilityRules(), ownShapesOnly({ unless: 'teach' })],
	stamps: [stampOwner()],
})
const ann = { userId: 'ann', abilities: ['edit'] }
const bob = { userId: 'bob', abilities: ['edit'] }

let editor: TestEditor
let denials: TLPermissionDenial[]
const A = createShapeId('a')

function geo(id = A, x = 0) {
	return { id, type: 'geo' as const, x, y: 0, props: { w: 100, h: 100, richText: toRichText('') } }
}

beforeEach(() => {
	editor = new TestEditor({ permissions })
	denials = []
	editor.on('permission-denied', (d) => denials.push(d))
	editor.permissions.setAccess(ann)
	editor.markHistoryStoppingPoint()
	editor.createShapes([geo()])
})

afterEach(() => editor.dispose())

it('stamps the owner on a new shape', () => {
	expect(editor.getShape(A)!.meta.ownerId).toBe('ann')
})

it("denies a change to someone else's shape and rolls it back as a whole", () => {
	editor.permissions.setAccess(bob)
	const before = editor.store.serialize('document')
	editor.updateShapes([{ id: A, type: 'geo', x: 500 }])
	expect(editor.store.serialize('document')).toEqual(before)
	expect(denials).toEqual([
		{ reason: 'You can only change your own shapes.', intent: null, source: 'local' },
	])
})

it('denies an action as one unit: no partial writes from the allowed part', () => {
	editor.permissions.setAccess(bob)
	const B = createShapeId('b')
	editor.run(() => {
		editor.createShapes([geo(B, 300)]) // allowed alone
		editor.updateShapes([{ id: A, type: 'geo', x: 500 }]) // denied
	})
	expect(editor.getShape(B)).toBeUndefined()
	expect(editor.getShape(A)!.x).toBe(0)
})

it('leaves the undo stack as it was', () => {
	editor.permissions.setAccess(bob)
	const undos = editor.getHistory().getNumUndos()
	editor.updateShapes([{ id: A, type: 'geo', x: 500 }])
	expect(editor.getHistory().getNumUndos()).toBe(undos)
	// the last allowed change is still the one undo takes back
	editor.permissions.setAccess(ann)
	editor.undo()
	expect(editor.getShape(A)).toBeUndefined()
})

it('emits no net store change for a denied run, so the sync client sends nothing', () => {
	editor.permissions.setAccess(bob)
	const listener = vi.fn()
	const off = editor.store.listen(listener, { source: 'user', scope: 'document' })
	editor.updateShapes([{ id: A, type: 'geo', x: 500 }])
	editor.store._flushHistory()
	off()
	for (const [{ changes }] of listener.mock.calls) {
		expect(changes.added).toEqual({})
		expect(changes.removed).toEqual({})
		for (const [from, to] of Object.values(changes.updated) as [unknown, unknown][]) {
			expect(to).toEqual(from)
		}
	}
})

it('keeps undo steps exactly as without permissions', () => {
	function drawThree(e: TestEditor) {
		for (let i = 0; i < 3; i++) {
			e.setCurrentTool('geo')
			e.pointerDown(i * 200, 300)
				.pointerMove(i * 200 + 100, 400)
				.pointerUp(i * 200 + 100, 400)
			e.setCurrentTool('select')
		}
		const counts = [e.getCurrentPageShapeIds().size]
		for (let i = 0; i < 3; i++) {
			e.undo()
			counts.push(e.getCurrentPageShapeIds().size)
		}
		return counts
	}
	const plain = new TestEditor()
	plain.createShapes([geo()])
	plain.markHistoryStoppingPoint()
	expect(drawThree(editor)).toEqual(drawThree(plain))
	plain.dispose()
})

it('cancels a drag with escape as without permissions', () => {
	function dragThenEscape(e: TestEditor) {
		e.selectNone()
		e.pointerDown(50, 50, { target: 'shape', shape: e.getShape(A)! })
		e.pointerMove(150, 50).pointerMove(250, 50)
		e.keyDown('Escape')
		return e.getShape(A)!.x
	}
	const plain = new TestEditor()
	plain.createShapes([geo()])
	expect(dragThenEscape(editor)).toBe(dragThenEscape(plain))
	plain.dispose()
})

it('leaves the tool working when the drop of a drag is denied', () => {
	const frameRule = definePermissions<TLRecord>({
		rules: [
			(tx) =>
				tx.changes.some(
					(c) => c.op === 'update' && (c.prev as any).parentId !== (c.next as any).parentId
				)
					? 'No moving into frames.'
					: undefined,
		],
	})
	editor.dispose()
	editor = new TestEditor({ permissions: frameRule })
	denials = []
	editor.on('permission-denied', (d) => denials.push(d))
	const F = createShapeId('F')
	editor.createShapes([geo(), { id: F, type: 'frame', x: 300, y: 0, props: { w: 300, h: 300 } }])
	editor.pointerDown(50, 50, A)
	for (let x = 50; x <= 450; x += 50) editor.pointerMove(x, 50)
	editor.pointerUp(450, 50)
	expect(denials.map((d) => d.reason)).toContain('No moving into frames.')
	expect(editor.getPath()).toBe('select.idle')
	expect(editor.getShape(A)!.parentId).toBe(editor.getCurrentPageId())
	// the editor still works
	expect(() => editor.pointerDown(450, 50, A).pointerMove(500, 50).pointerUp(500, 50)).not.toThrow()
})

it('checks nested runs once, as the outermost transaction', () => {
	editor.permissions.setAccess(bob)
	const B = createShapeId('b')
	editor.run(() => {
		editor.run(() => editor.createShapes([geo(B, 300)]))
		editor.run(() => editor.updateShapes([{ id: A, type: 'geo', x: 500 }]))
	})
	expect(editor.getShape(B)).toBeUndefined()
	expect(denials).toHaveLength(1)
})

it('lets an ability widen a rule', () => {
	editor.permissions.setAccess({ userId: 'tia', abilities: ['edit', 'teach'] })
	editor.updateShapes([{ id: A, type: 'geo', x: 500 }])
	expect(editor.getShape(A)!.x).toBe(500)
})

it('wouldAllow answers without changing anything', () => {
	editor.permissions.setAccess(bob)
	const verdict = editor.permissions.wouldAllow(() => editor.deleteShapes([A]))
	expect(verdict).toEqual({ ok: false, reason: 'You can only delete your own shapes.' })
	expect(editor.getShape(A)).toBeDefined()
	expect(denials).toEqual([])
})

it('is read-only without the edit ability', () => {
	editor.permissions.setAccess({ userId: 'val', abilities: [] })
	editor.createShapes([geo(createShapeId('v'))])
	expect(editor.getShape(createShapeId('v'))).toBeUndefined()
	expect(denials.at(-1)?.source).toBe('local')
})

describe('mutate', () => {
	const withMutators = definePermissions<TLRecord>({
		rules: defaultAbilityRules(),
		mutators: {
			move(ctx, args: { x: number }) {
				const shape = ctx.get(A) as any
				ctx.put([{ ...shape, x: args.x }])
				if (args.x < 0) throw new Error('No negative x.')
			},
		},
	})

	beforeEach(() => {
		editor.dispose()
		editor = new TestEditor({ permissions: withMutators })
		denials = []
		editor.on('permission-denied', (d) => denials.push(d))
		editor.createShapes([geo()])
	})

	it('runs a mutator as one transaction with its intent', () => {
		editor.permissions.mutate('move', { x: 50 })
		expect(editor.getShape(A)!.x).toBe(50)
	})

	it('runs a mutator inside another run with its own intent', () => {
		editor.run(() => editor.permissions.mutate('move', { x: 70 }))
		expect(editor.getShape(A)!.x).toBe(70)
		expect(denials).toEqual([])
	})

	it('denies a mutator that throws, with its partial writes undone', () => {
		editor.markHistoryStoppingPoint()
		editor.permissions.mutate('move', { x: -5 })
		expect(editor.getShape(A)!.x).toBe(0)
		// nothing to redo: the partial write never reached the history
		editor.undo()
		editor.redo()
		expect(editor.getShape(A)!.x).toBe(0)
		expect(denials).toEqual([
			{ reason: 'No negative x.', intent: { name: 'move', args: { x: -5 } }, source: 'local' },
		])
	})

	it('throws for an unknown mutator', () => {
		expect(() => editor.permissions.mutate('nope')).toThrow('No mutator named "nope"')
	})
})
