import {
	Editor,
	IndexKey,
	TLRecord,
	TLShape,
	TLShapeId,
	createShapeId,
	defaultAbilityRules,
	definePermissions,
	ownShapesOnly,
	stampOwner,
	toRichText,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncHarness } from './harness'

// Each `editor.run` is one transaction: the editor checks it before it commits, the client sends
// it as one push, and the server checks that push as a whole.

let h: SyncHarness
beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	h?.dispose()
	vi.useRealTimers()
})

const editor = { userId: 'ann', abilities: ['edit'] }
const viewer = { userId: 'val', abilities: [] }

function geo(id: TLShapeId, x = 0) {
	return { id, type: 'geo' as const, x, y: 0, props: { w: 100, h: 100, richText: toRichText('') } }
}

describe('file read and write control by access', () => {
	beforeEach(() => {
		h = new SyncHarness(definePermissions<TLRecord>({ rules: defaultAbilityRules() }))
	})

	it('shows every user the same document', () => {
		const ann = h.connect('ann', editor)
		const val = h.connect('val', viewer)
		ann.editor.createShapes([geo(createShapeId('a'))])
		h.settle()
		expect(val.editor.getShape(createShapeId('a'))).toBeDefined()
		expect(h.serverRecord(createShapeId('a'))).toBeDefined()
	})

	it('a viewer is read-only, and the editor denies its writes before they leave the client', () => {
		const val = h.connect('val', viewer)
		expect(val.editor.getIsReadonly()).toBe(true)
		expect(val.editor.permissions.can('edit')).toBe(false)

		val.editor.run(() => val.editor.createShapes([geo(createShapeId('v'))]), {
			ignoreShapeLock: true,
		})
		// read-only mode turns most writes into no-ops; a write that gets past it is denied
		val.store.withTransaction(() => val.editor.store.put([shapeRecord(val, 'v2')]))
		h.settle()
		expect(h.serverRecord(createShapeId('v2'))).toBeUndefined()
		expect(val.editor.getShape(createShapeId('v2'))).toBeUndefined()
		expect(val.store.props.collaboration?.lastDenial?.get()).toMatchObject({
			reason: 'You need "edit" access to change shape records.',
			source: 'server',
		})
	})

	it('changes access live, with no reconnect', () => {
		const val = h.connect('val', viewer)
		val.setServerAccess({ userId: 'val', abilities: ['edit'] })
		expect(val.editor.getIsReadonly()).toBe(false)
		val.editor.createShapes([geo(createShapeId('v'))])
		h.settle()
		expect(h.serverRecord(createShapeId('v'))).toBeDefined()

		val.setServerAccess(viewer)
		expect(val.editor.getIsReadonly()).toBe(true)
	})
})

describe('one transaction per editor.run', () => {
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [
					...defaultAbilityRules(),
					// a server-only rule, so the client's own guard lets the change through
					(tx) =>
						tx.changes.some((c) => (c.next as any)?.meta?.forbidden)
							? 'Forbidden shapes are not allowed.'
							: undefined,
				],
			})
		)
	})

	it('denies one action without taking other actions from the same frame with it', () => {
		const ann = h.connect('ann', editor)
		const ok1 = createShapeId('ok1')
		const bad = createShapeId('bad')
		const ok2 = createShapeId('ok2')
		// three actions in one frame: without transaction boundaries they would go up as one push
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'ok1')]))
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'bad'), meta: { forbidden: true } }])
		)
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'ok2', 200)]))
		h.settle()

		expect(h.serverRecord(ok1)).toBeDefined()
		expect(h.serverRecord(bad)).toBeUndefined()
		expect(h.serverRecord(ok2)).toBeDefined()
		expect(ann.editor.getShape(bad)).toBeUndefined()
		expect(ann.editor.getShape(ok2)).toBeDefined()
	})

	it('denies a later action that was built on a denied one before the client knew', () => {
		const ann = h.connect('ann', editor)
		const bad = createShapeId('bad')
		const child = createShapeId('child')
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'bad', 0, 'frame'), meta: { forbidden: true } }])
		)
		// same frame: the client does not know yet that the frame will be denied
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'child'), parentId: bad }])
		)
		h.settle()
		expect(h.serverRecord(bad)).toBeUndefined()
		expect(h.serverRecord(child)).toBeUndefined()
		expect(ann.editor.getShape(child)).toBeUndefined()
		expect(ann.store.props.collaboration?.lastDenial?.get()?.reason).toBe(
			'This change depends on a change that was denied.'
		)

		// once the client has seen the denial, its next actions are judged on their own again
		ann.editor.createShapes([geo(createShapeId('after'))])
		h.settle()
		expect(h.serverRecord(createShapeId('after'))).toBeDefined()
	})
})

describe('classroom: students edit only their own shapes', () => {
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [...defaultAbilityRules(), ownShapesOnly({ unless: 'teach' })],
				stamps: [stampOwner()],
			})
		)
	})
	const student = (id: string) => ({ userId: id, abilities: ['edit'] })
	const teacher = { userId: 'tia', abilities: ['edit', 'teach'] }

	it('stamps new shapes with their owner, and the server verifies the stamp', () => {
		const ann = h.connect('ann', student('ann'))
		ann.editor.createShapes([geo(createShapeId('a'))])
		h.settle()
		expect(h.serverRecord(createShapeId('a'))?.meta).toEqual({ ownerId: 'ann' })

		// a forged owner never reaches the server
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'forged'), meta: { ownerId: 'bob' } }])
		)
		h.settle()
		expect(h.serverRecord(createShapeId('forged'))).toBeUndefined()
	})

	it("denies changes to another student's shape, locally and with a reason", () => {
		const ann = h.connect('ann', student('ann'))
		const bob = h.connect('bob', student('bob'))
		const a = createShapeId('a')
		ann.editor.createShapes([geo(a)])
		h.settle()

		bob.editor.updateShapes([{ id: a, type: 'geo', x: 500 }])
		expect(bob.editor.getShape(a)!.x).toBe(0)
		expect(bob.denials).toEqual([
			{ reason: 'You can only change your own shapes.', intent: null, source: 'local' },
		])
		bob.editor.deleteShapes([a])
		expect(bob.editor.getShape(a)).toBeDefined()
		h.settle()
		expect(h.serverRecord(a)).toMatchObject({ x: 0 })
	})

	it("denies grouping your shape with someone else's as one unit", () => {
		const ann = h.connect('ann', student('ann'))
		const bob = h.connect('bob', student('bob'))
		const a = createShapeId('a')
		const b = createShapeId('b')
		ann.editor.createShapes([geo(a)])
		h.settle()
		bob.editor.createShapes([geo(b, 200)])
		h.settle()

		bob.editor.groupShapes([a, b])
		// no group, and no half-done reparent of bob's own shape
		expect(bob.editor.getCurrentPageShapes().map((s) => s.type)).toEqual(['geo', 'geo'])
		expect(bob.editor.getShape(b)!.parentId).toBe(bob.editor.getCurrentPageId())
		h.settle()
		expect(h.serverRecords().filter((r) => r.typeName === 'shape')).toHaveLength(2)
	})

	it("denies deleting your frame while it holds someone else's shape", () => {
		const ann = h.connect('ann', student('ann'))
		const bob = h.connect('bob', student('bob'))
		const frame = createShapeId('frame')
		const b = createShapeId('b')
		ann.editor.createShapes([{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } }])
		h.settle()
		bob.editor.createShapes([{ ...geo(b, 10), parentId: frame }])
		h.settle()
		expect(h.serverRecord(b)).toMatchObject({ parentId: frame })

		ann.editor.deleteShapes([frame])
		expect(ann.editor.getShape(frame)).toBeDefined()
		expect(ann.editor.getShape(b)).toBeDefined()
		expect(ann.denials[0].reason).toBe('You can only delete your own shapes.')
	})

	it("lets a student connect an arrow to someone else's shape", () => {
		const ann = h.connect('ann', student('ann'))
		const bob = h.connect('bob', student('bob'))
		const a = createShapeId('a')
		const arrow = createShapeId('arrow')
		ann.editor.createShapes([geo(a)])
		h.settle()
		bob.editor.createShapes([{ id: arrow, type: 'arrow', x: 300, y: 50 }])
		bob.editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId: a,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			},
		})
		h.settle()
		expect(bob.denials).toEqual([])
		expect(h.serverRecords().filter((r) => r.typeName === 'binding')).toHaveLength(1)

		// ann can still move her shape: the arrow follows through its binding, not by a write
		ann.editor.updateShapes([{ id: a, type: 'geo', x: 50 }])
		h.settle()
		expect(ann.denials).toEqual([])
		expect(h.serverRecord(a)).toMatchObject({ x: 50 })
	})

	it('lets the teacher change any shape', () => {
		const ann = h.connect('ann', student('ann'))
		const tia = h.connect('tia', teacher)
		const a = createShapeId('a')
		ann.editor.createShapes([geo(a)])
		h.settle()
		tia.editor.updateShapes([{ id: a, type: 'geo', x: 500 }])
		h.settle()
		expect(tia.denials).toEqual([])
		expect(h.serverRecord(a)).toMatchObject({ x: 500, meta: { ownerId: 'ann' } })
	})
})

function shapeRecord(user: { editor: Editor }, id: string, x = 0, type = 'geo'): TLShape {
	const { editor } = user
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type,
		x,
		y: 0,
		rotation: 0,
		index: 'a1' as IndexKey,
		parentId: editor.getCurrentPageId(),
		isLocked: false,
		opacity: 1,
		meta: {},
		props: editor.getShapeUtil(type as TLShape['type']).getDefaultProps(),
	} as TLShape
}
