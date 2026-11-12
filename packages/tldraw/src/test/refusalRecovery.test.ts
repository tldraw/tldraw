import {
	createShapeId,
	createTLStore,
	Editor,
	TLGeoShape,
	TLRecord,
	TLRefusal,
	TLStoreAuthorize,
	TLWriteRule,
} from '@tldraw/editor'
import { defaultBindingUtils } from '../lib/defaultBindingUtils'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

// Recovery after a local refusal: the tool ends its interaction, work accepted earlier stays, and
// undo and redo stay in step with the document.

function setup(rule: TLWriteRule<TLRecord>) {
	let current = rule
	const authorize: TLStoreAuthorize = {
		rule: (args) => current(args),
		getSession: () => ({
			sessionId: 's',
			userId: 'u',
			meta: null,
			access: { document: 'write', objects: 'write' },
			permissions: null,
		}),
	}
	const editor = new TestEditor({}, { authorize })
	fakeLicense(editor)
	const refusals: TLRefusal[] = []
	editor.on('refused', (r) => refusals.push(r))
	return { editor, refusals, setRule: (r: TLWriteRule<TLRecord>) => (current = r) }
}

const allowAll: TLWriteRule<TLRecord> = () => null
const refuseIf =
	(test: (change: Parameters<TLWriteRule<TLRecord>>[0]['changes'][number]) => boolean) =>
	({ changes }: Parameters<TLWriteRule<TLRecord>>[0]) =>
		changes.some(test) ? { reason: 'no' } : null
const isIdle = (editor: TestEditor) => editor.getPath().endsWith('.idle')
// the history manager is protected; bracket access reads it for the test
const historyOf = (editor: TestEditor) => [
	editor['history'].getNumUndos(),
	editor['history'].getNumRedos(),
]

const a = createShapeId('a')
const b = createShapeId('b')

describe('after a local refusal', () => {
	it('a drag keeps the frames accepted before it, and the tool goes idle', () => {
		const { editor, refusals } = setup(
			refuseIf((c) => c.next?.typeName === 'shape' && (c.next as TLGeoShape).x > 300)
		)
		editor.createShapes([
			{ id: a, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } },
			{ id: b, type: 'geo', x: 0, y: 600 },
		])
		editor.markHistoryStoppingPoint('before drag')
		editor.pointerDown(125, 125, { target: 'shape', shape: editor.getShape(a)! })
		editor.pointerMove(200, 125).pointerMove(300, 125)
		// a peer's change lands mid-gesture
		editor.store.mergeRemoteChanges(() => editor.updateShapes([{ id: b, type: 'geo', y: 700 }]))
		editor.pointerMove(400, 125)
		expect(isIdle(editor)).toBe(true)
		editor.pointerMove(500, 125).pointerUp()

		expect(editor.getShape(a)!.x).toBe(275)
		expect(editor.getShape(b)!.y).toBe(700)
		expect(refusals.length).toBeGreaterThan(0)
		editor.undo()
		expect(editor.getShape(a)!.x).toBe(100)
		editor.redo()
		expect(editor.getShape(a)!.x).toBe(275)
	})

	it('a resize keeps the size accepted before it, and the tool goes idle', () => {
		const { editor } = setup(
			refuseIf((c) => c.next?.typeName === 'shape' && (c.next as TLGeoShape).props.w > 150)
		)
		editor.createShapes([{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.select(a)
		editor.pointerDown(100, 100, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(140, 140).pointerMove(250, 250)
		expect(isIdle(editor)).toBe(true)
		editor.pointerUp()
		expect((editor.getShape(a) as TLGeoShape).props.w).toBe(140)
	})

	it('a shape tool whose create is refused leaves no shape and no tool stuck on it', () => {
		const { editor, refusals } = setup(
			refuseIf((c) => c.type === 'create' && c.next.typeName === 'shape')
		)
		editor.setCurrentTool('geo')
		editor.pointerDown(100, 100).pointerMove(200, 200)
		expect(isIdle(editor)).toBe(true)
		editor.pointerMove(300, 300).pointerUp()
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(refusals).toHaveLength(1)
	})

	it('a text shape whose create is refused is not left in editing', () => {
		const { editor } = setup(refuseIf((c) => c.type === 'create' && c.next.typeName === 'shape'))
		editor.doubleClick(200, 200)
		expect(editor.getEditingShapeId()).toBeNull()
		expect(isIdle(editor)).toBe(true)
	})

	it('an arrow keeps itself when only its binding is refused', () => {
		const { editor } = setup(refuseIf((c) => c.type === 'create' && c.next.typeName === 'binding'))
		editor.createShapes([{ id: a, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } }])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50).pointerMove(150, 50).pointerMove(350, 50).pointerUp()
		expect(editor.getCurrentPageShapes().map((s) => s.type)).toEqual(['geo', 'arrow'])
		expect(editor.getBindingsToShape(a, 'arrow')).toEqual([])
		expect(isIdle(editor)).toBe(true)
	})

	it('a refused undo leaves the document and the stacks where they were', () => {
		const { editor, refusals, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		setRule(refuseIf((c) => c.type === 'delete'))

		const before = historyOf(editor)
		editor.undo()
		expect(editor.getShape(a)).toBeDefined()
		expect(historyOf(editor)).toEqual(before)
		expect(refusals.map((r) => r.reason)).toEqual(['no'])

		setRule(allowAll)
		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
	})

	it('a refused redo leaves the document and the stacks where they were', () => {
		const { editor, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		editor.undo()
		setRule(refuseIf((c) => c.type === 'create'))

		const before = historyOf(editor)
		editor.redo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(historyOf(editor)).toEqual(before)

		setRule(allowAll)
		editor.redo()
		expect(editor.getShape(a)).toBeDefined()
	})

	it('a refused edit leaves redo as it was', () => {
		const { editor, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		editor.undo()
		setRule(refuseIf((c) => c.type === 'create' && c.next.id === b))
		editor.createShapes([{ id: b, type: 'geo' }])
		expect(editor.getCanRedo()).toBe(true)
		editor.redo()
		expect(editor.getShape(a)).toBeDefined()
	})

	it('history follows the canvas when an undo inside an operation is refused', () => {
		const { editor, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		setRule(refuseIf((c) => c.type === 'delete'))
		const before = historyOf(editor)
		editor.run(() => editor.undo())
		expect(editor.getShape(a)).toBeDefined()
		expect(historyOf(editor)).toEqual(before)
		setRule(allowAll)
		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
	})

	it('history follows the canvas when a redo inside an operation is refused', () => {
		const { editor, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		editor.undo()
		setRule(refuseIf((c) => c.type === 'create'))
		const before = historyOf(editor)
		editor.run(() => editor.redo())
		expect(editor.getShape(a)).toBeUndefined()
		expect(historyOf(editor)).toEqual(before)
	})

	it('history follows the canvas when a bail inside an operation is refused', () => {
		const { editor, setRule } = setup(allowAll)
		editor.createShapes([{ id: a, type: 'geo', x: 0 }])
		const mark = editor.markHistoryStoppingPoint('move')
		editor.updateShapes([{ id: a, type: 'geo', x: 100 }])
		setRule(refuseIf((c) => c.type === 'update'))
		const before = historyOf(editor)
		editor.run(() => editor.bailToMark(mark))
		expect(editor.getShape(a)!.x).toBe(100)
		expect(historyOf(editor)).toEqual(before)
		// the move is still there to undo once allowed
		setRule(allowAll)
		editor.undo()
		expect(editor.getShape(a)!.x).toBe(0)
	})

	it('cancelling a drag after updates were taken away keeps the drag undoable', () => {
		const { editor, setRule } = setup(allowAll)
		editor.createShapes([{ id: a, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } }])
		editor.pointerDown(125, 125, { target: 'shape', shape: editor.getShape(a)! })
		editor.pointerMove(225, 125).pointerMove(325, 125)
		setRule(refuseIf((c) => c.type === 'update'))
		const before = historyOf(editor)
		editor.cancel()
		expect(editor.getShape(a)!.x).toBe(300)
		expect(historyOf(editor)).toEqual(before)
		expect(isIdle(editor)).toBe(true)
		setRule(allowAll)
		editor.undo()
		expect(editor.getShape(a)!.x).toBe(100)
	})

	it('alt-cloning after creates were taken away keeps the drag and its history', () => {
		const { editor, setRule, refusals } = setup(allowAll)
		editor.createShapes([{ id: a, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } }])
		editor.pointerDown(125, 125, { target: 'shape', shape: editor.getShape(a)! })
		editor.pointerMove(225, 125)
		setRule(refuseIf((c) => c.type === 'create'))
		const before = historyOf(editor)
		editor.keyDown('Alt')
		expect(historyOf(editor)).toEqual(before)
		expect(refusals.length).toBeGreaterThan(0)
		editor.pointerMove(325, 125)
		editor.keyUp('Alt')
		editor.pointerUp()
		expect(editor.getCurrentPageShapes().map((s) => s.id)).toEqual([a])
		setRule(allowAll)
		editor.undo()
		expect(editor.getShape(a)!.x).toBe(100)
	})

	it("ends the interaction even when a 'refused' listener throws", () => {
		const { editor } = setup(refuseIf((c) => c.type === 'create' && c.next.typeName === 'shape'))
		editor.on('refused', () => {
			throw new Error('host bug')
		})
		editor.setCurrentTool('geo')
		expect(() => editor.pointerDown(100, 100).pointerMove(200, 200)).toThrow('host bug')
		expect(isIdle(editor)).toBe(true)
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('an operation that throws leaves canvas and history as they were', () => {
		const { editor } = setup(allowAll)
		editor.markHistoryStoppingPoint('start')
		const before = historyOf(editor)
		expect(() =>
			editor.run(() => {
				editor.createShapes([{ id: a, type: 'geo' }])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(editor.getShape(a)).toBeUndefined()
		expect(historyOf(editor)).toEqual(before)
		// nothing of the failed write is left in history to replay later
		editor.markHistoryStoppingPoint('b')
		editor.createShapes([{ id: b, type: 'geo' }])
		editor.undo()
		editor.redo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeDefined()
	})

	it('a refusal after a thrown operation and clearHistory leaves history cleared', () => {
		const { editor, setRule } = setup(allowAll)
		editor.markHistoryStoppingPoint('create')
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(() =>
			editor.run(() => {
				editor.updateShapes([{ id: a, type: 'geo', x: 50 }])
				throw new Error('boom')
			})
		).toThrow('boom')
		editor.clearHistory()
		setRule(refuseIf((c) => c.type === 'create'))
		editor.createShapes([{ id: b, type: 'geo' }])
		expect(historyOf(editor)).toEqual([0, 0])
	})

	it('a nested operation that throws rolls back with the outer one, history included', () => {
		const { editor } = setup(allowAll)
		editor.markHistoryStoppingPoint('start')
		const before = historyOf(editor)
		expect(() =>
			editor.run(() => {
				editor.createShapes([{ id: a, type: 'geo' }])
				editor.run(() => {
					editor.createShapes([{ id: b, type: 'geo' }])
					throw new Error('boom')
				})
			})
		).toThrow('boom')
		expect([editor.getShape(a), editor.getShape(b)]).toEqual([undefined, undefined])
		expect(historyOf(editor)).toEqual(before)
	})
})

describe('an editor with no current tool', () => {
	it('refuses without throwing', () => {
		const editor = new Editor({
			store: createTLStore({ authorize: { rule: () => ({ reason: 'no' }) } }),
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.body,
		})
		fakeLicense(editor)
		const a = createShapeId('headless')
		expect(() => editor.createShapes([{ id: a, type: 'geo' }])).not.toThrow()
		expect(editor.getShape(a)).toBeUndefined()
		editor.dispose()
	})
})
