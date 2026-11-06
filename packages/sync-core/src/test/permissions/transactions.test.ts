import {
	Editor,
	IndexKey,
	PageRecordType,
	TLArrowShape,
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
					(tx) => (tx.intent?.name === 'blocked' ? 'This action is blocked.' : undefined),
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

describe('offline changes', () => {
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [
					...defaultAbilityRules(),
					(tx) =>
						tx.changes.some((c) => (c.next as any)?.meta?.forbidden)
							? 'Forbidden shapes are not allowed.'
							: undefined,
					(tx) => (tx.intent?.name === 'blocked' ? 'This action is blocked.' : undefined),
					(tx) =>
						(tx.after.get('document:document' as any) as any)?.meta?.locked &&
						tx.changes.some((c) => ((c.next as any)?.x ?? 0) >= 20)
							? 'The right side is locked.'
							: undefined,
				],
			})
		)
	})

	it('go up one action at a time, so a denial removes only that action', () => {
		const ann = h.connect('ann', editor)
		ann.goOffline()
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'ok1')]))
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'bad'), meta: { forbidden: true } }])
		)
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'ok2', 200)]))
		// still offline: nothing reached the server
		expect(h.serverRecord(createShapeId('ok1'))).toBeUndefined()

		ann.reconnect()
		expect(h.serverRecord(createShapeId('ok1'))).toBeDefined()
		expect(h.serverRecord(createShapeId('bad'))).toBeUndefined()
		expect(h.serverRecord(createShapeId('ok2'))).toBeDefined()
		expect(ann.editor.getShape(createShapeId('bad'))).toBeUndefined()
		expect(ann.editor.getShape(createShapeId('ok2'))).toBeDefined()
	})

	it('keep their intent', () => {
		const ann = h.connect('ann', editor)
		ann.goOffline()
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'plain')]))
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'named', 200)]), {
			intent: { name: 'blocked' },
		})
		ann.reconnect()
		expect(h.serverRecord(createShapeId('plain'))).toBeDefined()
		expect(h.serverRecord(createShapeId('named'))).toBeUndefined()
		expect(ann.store.props.collaboration?.lastDenial?.get()?.reason).toBe('This action is blocked.')
	})

	it('deny an offline action built on a denied offline action', () => {
		const ann = h.connect('ann', editor)
		const bad = createShapeId('bad')
		ann.goOffline()
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'bad', 0, 'frame'), meta: { forbidden: true } }])
		)
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'child'), parentId: bad }])
		)
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'other', 300)]))
		ann.reconnect()
		expect(h.serverRecord(bad)).toBeUndefined()
		expect(h.serverRecord(createShapeId('child'))).toBeUndefined()
		expect(h.serverRecord(createShapeId('other'))).toBeDefined()
	})

	it('go up one undo step at a time, so the frames of one drag are one action', () => {
		const ann = h.connect('ann', editor)
		const bob = h.connect('bob', editor)
		const dragged = createShapeId('dragged')
		const other = createShapeId('other')
		ann.goOffline()
		ann.editor.markHistoryStoppingPoint('draw')
		ann.editor.createShapes([{ id: dragged, type: 'geo', x: 0, y: 0 }])
		ann.editor.updateShapes([{ id: dragged, type: 'geo', x: 10 }])
		ann.editor.updateShapes([{ id: dragged, type: 'geo', x: 30 }])
		// a tool sets the mark inside the run that creates the shape
		ann.editor.run(() => {
			ann.editor.markHistoryStoppingPoint('next')
			ann.editor.createShapes([{ id: other, type: 'geo', x: 0, y: 300 }])
		})
		// meanwhile, the server starts to deny the end of the drag
		bob.editor.updateDocumentSettings({ meta: { locked: true } })
		ann.reconnect()
		// the whole drag is denied, not only its last frame
		expect(h.serverRecord(dragged)).toBeUndefined()
		expect(ann.editor.getShape(dragged)).toBeUndefined()
		expect(h.serverRecord(other)).toBeDefined()
	})

	it('resend pushes that were in flight when the connection dropped', () => {
		const ann = h.connect('ann', editor)
		ann.store.withTransaction(() => ann.store.put([shapeRecord(ann, 'inflight')]))
		ann.store._flushHistory()
		vi.advanceTimersByTime(50) // the push leaves the client, but the server never gets it
		ann.goOffline()
		expect(h.serverRecord(createShapeId('inflight'))).toBeUndefined()
		ann.reconnect()
		expect(h.serverRecord(createShapeId('inflight'))).toBeDefined()
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

		// a copy of someone else's shape (a paste, a duplicate) becomes yours
		ann.store.withTransaction(() =>
			ann.store.put([{ ...shapeRecord(ann, 'copy'), meta: { ownerId: 'bob' } }])
		)
		h.settle()
		expect(h.serverRecord(createShapeId('copy'))?.meta).toEqual({ ownerId: 'ann' })
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

	it("lets a student delete their shape when someone else's arrow points at it", () => {
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

		ann.editor.deleteShapes([a])
		h.settle()
		expect(ann.denials).toEqual([])
		expect(h.serverRecord(a)).toBeUndefined()
		expect(h.serverRecords().filter((r) => r.typeName === 'binding')).toHaveLength(0)
		// bob's arrow stays, unbound, where its end was
		expect(h.serverRecord(arrow)).toBeDefined()
		expect(bob.editor.getShape(arrow)).toBeDefined()
	})

	it("does not let cutting a binding move the rest of someone else's arrow", () => {
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
		const binding = ann.editor.getBindingsToShape(a, 'arrow')[0]
		ann.editor.run(() => {
			ann.editor.deleteBinding(binding)
			ann.editor.updateShapes([{ id: arrow, type: 'arrow', x: 900 }])
		})
		h.settle()
		expect(ann.denials.at(-1)?.reason).toBe('You can only change your own shapes.')
		expect(h.serverRecord(arrow)).toMatchObject({ x: 300 })
	})

	it("does not let cutting one end of someone else's arrow move its other end", () => {
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
		const startBefore = (h.serverRecord(arrow) as TLArrowShape).props.start
		const binding = ann.editor.getBindingsToShape(a, 'arrow')[0]
		ann.editor.run(() => {
			ann.editor.deleteBinding(binding)
			ann.editor.updateShapes([
				{ id: arrow, type: 'arrow', props: { start: { x: -500, y: -500 } } },
			])
		})
		h.settle()
		expect(ann.denials.at(-1)?.reason).toBe('You can only change your own shapes.')
		expect((h.serverRecord(arrow) as TLArrowShape).props.start).toEqual(startBefore)
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

describe('reconnect', () => {
	it('keeps one queue entry per offline gesture, not one per frame', () => {
		h = new SyncHarness(definePermissions<TLRecord>({ rules: [() => undefined] }))
		const ann = h.connect('ann', editor)
		const id = createShapeId('dragged')
		ann.editor.createShapes([{ id, type: 'geo', x: 0, y: 0 }])
		h.settle()
		ann.goOffline()
		ann.editor.markHistoryStoppingPoint('drag')
		for (let x = 1; x <= 200; x++) {
			ann.editor.updateShape({ id, type: 'geo', x })
			ann.store._flushHistory()
		}
		const queued = (ann.client as any).unsentChanges.nextDiffs.length
		ann.reconnect()
		h.settle()
		expect({ queued, x: (h.serverRecord(id) as TLShape | undefined)?.x }).toEqual({
			queued: 1,
			x: 200,
		})
	})

	it('does not send a named push again when its answer was lost, so a mutator runs once', () => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				mutators: {
					// a new page with a random id: the server's result differs from the prediction
					addPage(ctx) {
						const n = [...ctx.all()].filter((r) => r.typeName === 'page').length
						ctx.put([PageRecordType.create({ name: 'p' + n, index: ('a' + (n + 5)) as IndexKey })])
					},
				},
			})
		)
		const ann = h.connect('ann', editor)
		const serverPages = () => h.serverRecords().filter((r) => r.typeName === 'page').length
		ann.editor.permissions.mutate('addPage')
		ann.store._flushHistory()
		vi.advanceTimersByTime(50)
		// the server gets the push and runs the mutator, but its answer is lost
		const queue = (h as any).queue as Array<() => void>
		for (const deliver of queue.splice(0)) deliver()
		expect(serverPages()).toBe(2)
		ann.goOffline()
		ann.reconnect()
		h.settle()
		expect({ server: serverPages(), client: ann.editor.getPages().length }).toEqual({
			server: 2,
			client: 2,
		})
	})
})
