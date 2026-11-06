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

it('emits no store change for a denied run', () => {
	editor.permissions.setAccess(bob)
	const listener = vi.fn()
	const off = editor.store.listen(listener, { source: 'user', scope: 'document' })
	editor.updateShapes([{ id: A, type: 'geo', x: 500 }])
	editor.store._flushHistory()
	off()
	expect(listener).not.toHaveBeenCalled()
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

	it('denies a mutator that throws, with its partial writes undone', () => {
		editor.permissions.mutate('move', { x: -5 })
		expect(editor.getShape(A)!.x).toBe(0)
		expect(denials).toEqual([
			{ reason: 'No negative x.', intent: { name: 'move', args: { x: -5 } }, source: 'local' },
		])
	})

	it('throws for an unknown mutator', () => {
		expect(() => editor.permissions.mutate('nope')).toThrow('No mutator named "nope"')
	})
})
