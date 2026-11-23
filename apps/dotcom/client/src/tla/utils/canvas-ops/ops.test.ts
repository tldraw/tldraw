import { applyObjectDiff, diffRecord } from '@tldraw/sync-core'
import {
	Box,
	createShapeId,
	createTLStore,
	createUserId,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	InstancePresenceRecordType,
	tipTapDefaultExtensions,
	type TLGeoShape,
	type TLLineShape,
	type TLMeasureTextOpts,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { describeShapes, hasAppliedBatch, markSelectionSeen, runBatch } from './actions'
import { applyOps } from './ops'
import { createCanvasOpsReceiver } from './receiver'
import type { CanvasAction } from './schema'

/** A headless editor whose text measurement is deterministic: 16 units per character and 32 per line at 24px, scaled by font size. */
function createTestEditor(): Editor {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		getContainer: () => container,
		textOptions: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		},
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1280, 800))
	const measure = (text: string, opts: TLMeasureTextOpts) => {
		const scale = (opts.fontSize || 24) / 24
		const lines = text
			.replace(/<\/p>\s*<p[^>]*>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.split('\n')
		const longest = Math.max(1, ...lines.map((l) => l.length))
		const w = Math.min(longest * 16 * scale, opts.maxWidth ?? Infinity)
		return { w, h: lines.length * 32 * scale, x: 0, y: 0, scrollWidth: w }
	}
	editor.textMeasure.measureText = measure
	editor.textMeasure.measureHtml = measure
	editor.textMeasure.measureHtmlBatch = (requests) => requests.map((r) => measure(r.html, r.opts))
	return editor
}

let editor: Editor
beforeEach(() => {
	editor = createTestEditor()
})
afterEach(() => editor.dispose())

const id = (s: string) => createShapeId(s)
const rect = (s: string) => editor.getShapePageBounds(id(s))!
const overlap = (a: Box, b: Box) =>
	a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function seed(actions: CanvasAction[]) {
	runBatch(editor, {}, (ctx) => {
		for (const action of actions) ctx.apply(action)
	})
}

function seedDiagram() {
	seed([
		{
			type: 'create_shape',
			id: 'api',
			geo: 'rectangle',
			x: 100,
			y: 100,
			w: 200,
			h: 100,
			text: 'API',
			color: 'violet',
		},
		{
			type: 'create_shape',
			id: 'db',
			geo: 'rectangle',
			x: 500,
			y: 100,
			w: 200,
			h: 100,
			text: 'Database',
			color: 'green',
		},
		{
			type: 'create_shape',
			id: 'heart',
			geo: 'heart',
			x: 300,
			y: 400,
			w: 120,
			h: 100,
			color: 'red',
			fill: 'solid',
		},
		{ type: 'create_note', id: 'n1', text: 'todo', x: 900, y: 500 },
	])
}

describe('references', () => {
	it('resolves ids, text, descriptions, and the selection', () => {
		seedDiagram()
		editor.select(id('heart'))
		const result = applyOps(editor, [
			{ op: 'restyle', targets: [{ text: 'database' }], color: 'blue' },
			{ op: 'restyle', targets: [{ description: 'the box labelled "API"' }], color: 'orange' },
			{ op: 'restyle', targets: { selected: true }, color: 'black' },
		])
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLGeoShape>(id('db'))!.props.color).toBe('blue')
		expect(editor.getShape<TLGeoShape>(id('api'))!.props.color).toBe('orange')
		expect(editor.getShape<TLGeoShape>(id('heart'))!.props.color).toBe('black')
	})

	// Presence is whatever its client sent, so what "the selection" means for a batch sent on a user's
	// behalf can't depend on a record claiming to be that user.
	it('never reads the selection from presence', () => {
		seedDiagram()
		editor.select(id('heart'))
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('guest'),
					userId: createUserId('victim'),
					userName: 'Guest',
					currentPageId: editor.getCurrentPageId(),
					selectedShapeIds: [id('api')],
				}),
			])
		})
		applyOps(editor, [{ op: 'remove', targets: { selected: true } }], { userId: 'victim' })
		expect(editor.getShape(id('api'))).toBeDefined()
		expect(editor.getShape(id('heart'))).toBeUndefined()
	})

	// The user's other tab closed mid-run and this one took over: its selection isn't what the agent saw.
	describe('a run that moved here from another tab', () => {
		const stampAsOtherTabs = (runId: string, userId: string) =>
			editor.updateShape({
				id: id('db'),
				type: 'geo',
				meta: { agent: { batchId: 'elsewhere', at: '', runId, userId } },
			})
		const restyleSelected = (attribution: { runId?: string; userId?: string }) =>
			applyOps(
				editor,
				[{ op: 'restyle', targets: { selected: true }, color: 'black' }],
				attribution
			)

		// A batch naming shapes by id says nothing about whether the agent saw this tab's selection.
		it('refuses the selection until the agent reads it, whatever batches come between', () => {
			seedDiagram()
			stampAsOtherTabs('run-1', 'u1')
			editor.select(id('heart'))
			const run = { runId: 'run-1', userId: 'u1' }

			expect(restyleSelected(run).errors).toEqual([
				expect.stringContaining('different browser tab'),
			])
			applyOps(editor, [{ op: 'restyle', targets: ['n1'], color: 'blue' }], run)
			expect(restyleSelected(run).errors).toEqual([
				expect.stringContaining('different browser tab'),
			])
			expect(editor.getShape<TLGeoShape>(id('heart'))!.props.color).not.toBe('black')

			markSelectionSeen(editor, 'run-1')
			expect(restyleSelected(run).errors).toEqual([])
			expect(editor.getShape<TLGeoShape>(id('heart'))!.props.color).toBe('black')
		})

		// Two agents of one user: one reading the selection says nothing about what the other saw.
		it("keeps refusing for a run whose agent didn't read the selection", () => {
			seedDiagram()
			stampAsOtherTabs('run-1', 'u1')
			editor.select(id('heart'))

			markSelectionSeen(editor, 'run-2')

			expect(restyleSelected({ runId: 'run-1', userId: 'u1' }).errors).toEqual([
				expect.stringContaining('different browser tab'),
			])
		})

		it('trusts the selection read before the run first reached this tab', () => {
			seedDiagram()
			stampAsOtherTabs('run-1', 'u1')
			editor.select(id('heart'))

			markSelectionSeen(editor, 'run-1')

			expect(restyleSelected({ runId: 'run-1', userId: 'u1' }).errors).toEqual([])
		})

		it("ignores another user's run with the same id", () => {
			seedDiagram()
			stampAsOtherTabs('run-1', 'u2')
			editor.select(id('heart'))

			expect(restyleSelected({ runId: 'run-1', userId: 'u1' }).errors).toEqual([])
		})

		it('trusts the selection in a run that started here', () => {
			seedDiagram()
			editor.select(id('heart'))

			expect(restyleSelected({ runId: 'run-1', userId: 'u1' }).errors).toEqual([])
			expect(restyleSelected({ runId: 'run-1', userId: 'u1' }).errors).toEqual([])
		})
	})

	// Two tabs record keys at once and the server applies both pushes to its copy of the document.
	it("keeps both tabs' batch keys when they record at the same time", () => {
		const other = createTestEditor()
		const base = editor.getDocumentSettings()
		runBatch(editor, { userId: 'u1', batchKey: 'k1' }, () => {})
		runBatch(other, { userId: 'u2', batchKey: 'k2' }, () => {})

		let server = base
		for (const tab of [editor, other]) {
			server = applyObjectDiff(server, diffRecord(base, tab.getDocumentSettings())!)
		}
		editor.store.mergeRemoteChanges(() => editor.store.put([server]))

		expect(hasAppliedBatch(editor, { userId: 'u1', batchKey: 'k1' })).toBe(true)
		expect(hasAppliedBatch(editor, { userId: 'u2', batchKey: 'k2' })).toBe(true)
		other.dispose()
	})

	it('reports an ambiguous description as an op error and still runs the rest', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'remove', targets: [{ description: 'the box' }] },
			{ op: 'remove', targets: ['n1'] },
		])
		expect(result.errors).toEqual([expect.stringMatching(/^Op 0 \(remove\): 2 shapes match/)])
		expect(result.applied).toBe(1)
		expect(editor.getShape(id('n1'))).toBeUndefined()
	})
})

describe('add, place, and label', () => {
	it('places a new label above a target, centred', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{
				op: 'add',
				kind: 'label',
				text: 'Heart',
				id: 'lbl',
				relation: 'above',
				target: 'heart',
				gap: 20,
			},
		])
		expect(result.errors).toEqual([])
		const label = rect('lbl')
		const heart = rect('heart')
		expect(label.y + label.h).toBeCloseTo(heart.y - 20, 0)
		expect(label.x + label.w / 2).toBeCloseTo(heart.x + heart.w / 2, 0)
	})

	it('moves an existing shape right of another and nudges when the spot is taken', () => {
		seedDiagram()
		seed([{ type: 'create_shape', id: 'blocker', geo: 'rectangle', x: 324, y: 110, w: 80, h: 80 }])
		const result = applyOps(editor, [
			{ op: 'place', subject: 'n1', relation: 'right_of', target: 'api', gap: 24, align: 'start' },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].adjusted).toMatch(/nudged|instead/)
		expect(overlap(rect('n1'), rect('blocker'))).toBe(false)
	})

	// Otherwise the agent takes the box to be the size it asked for.
	it('says when a box grew past the size it was given to fit its text', () => {
		const result = applyOps(editor, [
			{
				op: 'add',
				kind: 'box',
				id: 'tall',
				text: 'a label long enough to wrap',
				at: { x: 0, y: 0 },
				w: 120,
				h: 40,
			},
			{ op: 'add', kind: 'box', id: 'roomy', text: 'ok', at: { x: 0, y: 300 }, w: 200, h: 100 },
			{
				op: 'duplicate',
				subject: 'roomy',
				id: 'copy',
				at: { x: 400, y: 300 },
				text: 'now this one wraps\nonto more\nlines than before',
			},
		])
		expect(result.errors).toEqual([])
		expect(rect('tall').h).toBeGreaterThan(40)
		expect(result.results[0].adjusted).toMatch(/^grew from 120x40 to 120x\d+ to fit its text$/)
		expect(result.results[1].adjusted).toBeUndefined()
		expect(result.results[2].adjusted).toMatch(/^grew from 200x100 to 200x\d+ to fit its text$/)
	})

	it('stamps agentEdit only on shapes a later batch changes', () => {
		seedDiagram()
		const first = applyOps(editor, [
			{ op: 'add', kind: 'box', text: 'Cache', id: 'cache', relation: 'below', target: 'db' },
		])
		expect(editor.getShape(id('cache'))!.meta).toEqual({
			agent: expect.objectContaining({ batchId: first.batchId }),
		})
		const second = applyOps(editor, [{ op: 'rename', target: 'cache', text: 'Redis' }])
		expect(editor.getShape(id('cache'))!.meta).toEqual({
			agent: expect.objectContaining({ batchId: first.batchId }),
			agentEdit: expect.objectContaining({ batchId: second.batchId }),
		})
	})

	it('a new box beside a box takes its style and footprint', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'add', kind: 'box', text: 'Cache', id: 'cache', relation: 'below', target: 'db' },
		])
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLGeoShape>(id('cache'))!.props).toMatchObject({
			color: 'green',
			w: 200,
			h: 100,
		})
	})

	it('label with an arrow to a point lands the tip on the point', () => {
		seed([
			{
				type: 'create_shape',
				id: 'photo',
				geo: 'rectangle',
				x: 100,
				y: 100,
				w: 400,
				h: 300,
				fill: 'semi',
			},
		])
		const result = applyOps(editor, [
			{
				op: 'label',
				target: { point: { x: 250, y: 200 } },
				text: 'Roof',
				side: 'right',
				id: 'roof',
			},
		])
		expect(result.errors).toEqual([])
		const arrow = describeShapes(editor).find((s) => s.id === 'roof-arrow')!
		expect(arrow.arrowEnds!.end).toEqual({ x: 250, y: 200 })
		expect(rect('roof').x).toBeGreaterThan(250)
	})

	it('centres a fitting label inside an empty shape and omits the arrow', () => {
		seed([{ type: 'create_shape', id: 'region', geo: 'rectangle', x: 100, y: 100, w: 300, h: 160 }])
		const result = applyOps(editor, [
			{ op: 'label', target: 'region', text: 'North', arrow: true, id: 'north' },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].message).toMatch(/centred inside region.*without an arrow/)
		expect(rect('north').center.x).toBeCloseTo(rect('region').center.x)
		expect(rect('north').center.y).toBeCloseTo(rect('region').center.y)
		expect(describeShapes(editor).some((s) => s.type === 'arrow')).toBe(false)
	})
})

describe('connect', () => {
	it('reusing an arrow id replaces that arrow', () => {
		seedDiagram()
		applyOps(editor, [{ op: 'connect', from: 'api', to: 'db', id: 'link' }])
		const result = applyOps(editor, [{ op: 'connect', from: 'db', to: 'heart', id: 'link' }])
		expect(result.errors).toEqual([])
		const ends = editor.getBindingsFromShape(id('link'), 'arrow').map((b) => b.toId)
		expect(ends.sort()).toEqual([id('db'), id('heart')].sort())
	})

	it('binds an arrow between shapes', () => {
		seedDiagram()
		const result = applyOps(editor, [{ op: 'connect', from: 'api', to: 'db', id: 'link' }])
		expect(result.errors).toEqual([])
		const bindings = editor.getBindingsFromShape(id('link'), 'arrow').map((b) => b.toId)
		expect(bindings.sort()).toEqual([id('api'), id('db')].sort())
	})

	it('puts a label beside a short arrow instead of hiding its shaft', () => {
		const result = applyOps(editor, [
			{
				op: 'connect',
				from: { point: { x: 100, y: 100 } },
				to: { point: { x: 160, y: 100 } },
				text: 'Yes',
				id: 'short',
			},
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].adjusted).toMatch(/label moved beside the short arrow/)
		expect(describeShapes(editor).find((s) => s.id === 'short')?.text).toBeUndefined()
		expect(describeShapes(editor).find((s) => s.id === 'short-label')?.text).toBe('Yes')
	})

	it('keeps a label on a long arrow', () => {
		const result = applyOps(editor, [
			{
				op: 'connect',
				from: { point: { x: 100, y: 100 } },
				to: { point: { x: 400, y: 100 } },
				text: 'Yes',
				id: 'long',
			},
		])
		expect(result.errors).toEqual([])
		expect(describeShapes(editor).find((s) => s.id === 'long')?.text).toBe('Yes')
		expect(editor.getShape(id('long-label'))).toBeUndefined()
	})
})

describe('rename, restyle, remove, untangle, resize', () => {
	it('resizes about the centre inside a frame without jumping by the frame offset', () => {
		editor.createShape({
			id: id('frame'),
			type: 'frame',
			x: 500,
			y: 500,
			props: { w: 600, h: 600 },
		})
		editor.createShape({
			id: id('box'),
			type: 'geo',
			parentId: id('frame'),
			x: 100,
			y: 100,
			props: { w: 100, h: 100 },
		})
		const result = applyOps(editor, [{ op: 'resize', target: 'box', scale: 2, anchor: 'center' }])
		expect(result.errors).toEqual([])
		expect(rect('box')).toMatchObject({ x: 550, y: 550, w: 200, h: 200 })
	})

	it('rename widens a box so a long label stays one line', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'rename', target: 'api', text: 'Application programming interface' },
		])
		expect(result.results[0].adjusted).toMatch(/widened.*now overlaps db/)
		expect(rect('api').w).toBeGreaterThan(400)
		expect(rect('api').h).toBe(100)
	})

	it('rename says when a widened box swallows a neighbour, but not the shapes it already held', () => {
		seed([
			{
				type: 'create_shape',
				id: 'outline',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 1000,
				h: 400,
				dash: 'dashed',
			},
			{
				type: 'create_shape',
				id: 'box',
				geo: 'rectangle',
				x: 100,
				y: 100,
				w: 120,
				h: 80,
				text: 'A',
			},
			{ type: 'create_shape', id: 'dot', geo: 'ellipse', x: 260, y: 120, w: 30, h: 30 },
		])
		const result = applyOps(editor, [
			{ op: 'rename', target: 'box', text: 'A much longer label than before' },
		])
		expect(rect('box').w).toBeGreaterThan(200)
		expect(result.results[0].adjusted).toMatch(
			/^widened to \d+ so the label stays on one line; now covers dot$/
		)
	})

	it('duplicate says when the copy lands on a neighbour', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'duplicate', subject: 'api', id: 'copy', at: { x: 450, y: 120 } },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].adjusted).toBe('now overlaps db')
	})

	it('duplicate says when the copy lands exactly on a neighbour the same size', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'duplicate', subject: 'api', id: 'twin', at: { x: 500, y: 100 } },
		])
		expect(result.errors).toEqual([])
		expect(rect('twin')).toEqual(rect('db'))
		expect(result.results[0].adjusted).toBe('now covers db')
	})

	it('a box added at a point says what it lands on, but not what it sits close to', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{ op: 'add', kind: 'box', id: 'over', at: { x: 250, y: 150 }, w: 100, h: 60 },
			{ op: 'add', kind: 'box', id: 'near', at: { x: 310, y: 300 }, w: 100, h: 60 },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].adjusted).toBe('now overlaps api')
		expect(result.results[1].adjusted).toBeUndefined()
	})

	it('a box widened past its sibling for its label says it grew from the sibling size', () => {
		seedDiagram()
		const result = applyOps(editor, [
			{
				op: 'add',
				kind: 'box',
				id: 'wide',
				text: 'a label much longer than its neighbour',
				relation: 'below',
				target: 'api',
			},
		])
		expect(result.errors).toEqual([])
		expect(rect('wide').w).toBeGreaterThan(200)
		expect(result.results[0].adjusted).toMatch(
			/^styled like api \(.*200x100\); grew from 200x100 to \d+x\d+ to fit its text/
		)
	})

	it('restyles a shape like another', () => {
		seedDiagram()
		applyOps(editor, [{ op: 'restyle', targets: ['api'], like: 'db' }])
		expect(editor.getShape<TLGeoShape>(id('api'))!.props.color).toBe('green')
	})

	// The editor skips a locked shape without a word, which would otherwise read as done.
	it('reports an op on a locked shape as an error', () => {
		seedDiagram()
		editor.updateShape({ id: id('api'), type: 'geo', isLocked: true })
		const result = applyOps(editor, [
			{ op: 'rename', target: 'api', text: 'Renamed' },
			{ op: 'remove', targets: ['api'] },
		])
		expect(result.errors).toEqual([
			expect.stringContaining('is locked'),
			expect.stringContaining('is locked'),
		])
		expect(editor.getShape(id('api'))).toBeDefined()
	})

	it('untangle spreads overlapping labels while keeping them near their dots', () => {
		seed([
			{ type: 'create_shape', id: 'd1', geo: 'ellipse', x: 192, y: 192, w: 16, h: 16 },
			{ type: 'create_shape', id: 'd2', geo: 'ellipse', x: 222, y: 207, w: 16, h: 16 },
			{ type: 'create_text', id: 'l1', text: 'Mercury', x: 204, y: 186 },
			{ type: 'create_text', id: 'l2', text: 'Venus', x: 234, y: 201 },
		])
		const result = applyOps(editor, [
			{ op: 'untangle', targets: ['l1', 'l2'], keepNear: ['d1', 'd2'], maxDistance: 60 },
		])
		expect(result.errors).toEqual([])
		expect(overlap(rect('l1'), rect('l2'))).toBe(false)
		expect(Math.hypot(rect('l1').center.x - 200, rect('l1').center.y - 200)).toBeLessThan(120)
	})

	it('untangle leaves enclosing outlines and arrows where they are', () => {
		seed([
			{
				type: 'create_shape',
				id: 'outline',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 600,
				h: 300,
				dash: 'dashed',
			},
			{ type: 'create_shape', id: 'a', geo: 'rectangle', x: 40, y: 40, w: 120, h: 80 },
			{ type: 'create_shape', id: 'b', geo: 'rectangle', x: 400, y: 40, w: 120, h: 80 },
			{ type: 'create_arrow', id: 'ab', from: { shapeId: 'a' }, to: { shapeId: 'b' } },
			// Pokes over the outline's corner, which still mustn't pull the outline off its contents.
			{ type: 'create_shape', id: 'poke', geo: 'rectangle', x: 560, y: 260, w: 100, h: 80 },
		])
		const before = { outline: rect('outline'), ab: rect('ab') }
		const result = applyOps(editor, [{ op: 'untangle', targets: ['outline', 'a', 'b', 'ab'] }])
		expect(result.errors).toEqual([])
		expect(rect('outline')).toEqual(before.outline)
		expect(rect('ab')).toEqual(before.ab)
		expect(result.results[0]).toMatchObject({
			shapeIds: [],
			message: 'moved 0 of 2 shape(s) apart',
			adjusted:
				'left arrows alone: ab (they follow their shapes); left outlines alone: outline (they hold other shapes)',
		})
	})

	it('untangle separates overlapping frames, carrying their contents, and leaves a clear one alone', () => {
		const frame = (s: string, x: number, y: number) =>
			editor.createShape({ id: id(s), type: 'frame', x, y, props: { w: 300, h: 200 } })
		frame('f1', 0, 0)
		frame('f2', 200, 50)
		frame('f3', 0, 600)
		for (const [child, parent] of [
			['c1', 'f1'],
			['c2', 'f2'],
			['c3', 'f3'],
		]) {
			editor.createShape<TLGeoShape>({
				id: id(child),
				type: 'geo',
				parentId: id(parent),
				x: 20,
				y: 20,
				props: { w: 80, h: 60 },
			})
		}
		const before = { f3: rect('f3'), c3: rect('c3') }
		const result = applyOps(editor, [{ op: 'untangle', targets: ['f1', 'f2', 'f3'] }])
		expect(result.errors).toEqual([])
		expect(overlap(rect('f1'), rect('f2'))).toBe(false)
		expect(rect('c1').x - rect('f1').x).toBeCloseTo(20)
		expect(rect('c2').x - rect('f2').x).toBeCloseTo(20)
		expect({ f3: rect('f3'), c3: rect('c3') }).toEqual(before)
		expect(result.results[0].message).toBe('moved 1 of 3 shape(s) apart')
		expect(result.results[0].adjusted).toBeUndefined()
	})

	it('untangle still moves a box dropped over a smaller one', () => {
		seed([
			{ type: 'create_shape', id: 'small', geo: 'rectangle', x: 50, y: 50, w: 60, h: 40 },
			{
				type: 'create_shape',
				id: 'big',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 200,
				h: 150,
				fill: 'solid',
			},
		])
		const result = applyOps(editor, [
			{ op: 'untangle', targets: ['big', 'small'], maxDistance: 300 },
		])
		expect(result.results[0]).toMatchObject({
			shapeIds: ['big'],
			message: 'moved 1 of 2 shape(s) apart',
		})
		expect(overlap(rect('big'), rect('small'))).toBe(false)
	})

	it('resizes lines and closed paths, keeping the centre when asked', () => {
		applyOps(editor, [
			{
				op: 'path',
				id: 'zig',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
			},
			{
				op: 'path',
				id: 'blob',
				closed: true,
				points: [
					{ x: 400, y: 0 },
					{ x: 500, y: 0 },
					{ x: 450, y: 100 },
				],
			},
			// Lopsided, so scaling about its bounds' corner moves its origin.
			{
				op: 'path',
				id: 'tent',
				closed: true,
				points: [
					{ x: 0, y: 500 },
					{ x: 100, y: 450 },
					{ x: 200, y: 500 },
				],
			},
		])
		const zig = rect('zig')
		const blob = rect('blob')
		const tent = rect('tent')
		const result = applyOps(editor, [
			{ op: 'resize', target: 'zig', scale: 2 },
			{ op: 'resize', target: 'blob', w: blob.w * 3, h: blob.h * 3, anchor: 'center' },
			{ op: 'resize', target: 'tent', w: 600, h: 150, anchor: 'center' },
		])
		expect(result.errors).toEqual([])
		expect(rect('zig')).toMatchObject({ x: zig.x, y: zig.y, w: zig.w * 2, h: zig.h * 2 })
		expect(rect('blob').w).toBeCloseTo(blob.w * 3, 0)
		expect(rect('blob').center.x).toBeCloseTo(blob.center.x, 0)
		expect(rect('blob').center.y).toBeCloseTo(blob.center.y, 0)
		expect(rect('tent').center.x).toBeCloseTo(tent.center.x, 0)
		expect(rect('tent').center.y).toBeCloseTo(tent.center.y, 0)
	})

	it('resizes a rotated line along the page axes it was measured in', () => {
		applyOps(editor, [
			{
				op: 'path',
				id: 'zig',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
			},
		])
		editor.rotateShapesBy([id('zig')], Math.PI / 2)
		const before = rect('zig')
		const result = applyOps(editor, [{ op: 'resize', target: 'zig', h: before.h / 2 }])
		expect(result.errors).toEqual([])
		expect(rect('zig').w).toBeCloseTo(before.w, 0)
		expect(rect('zig').h).toBeCloseTo(before.h / 2, 0)
	})

	it('scales a path rotated off the page axes evenly, in place', () => {
		applyOps(editor, [
			{
				op: 'path',
				id: 'zig',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
			},
		])
		editor.rotateShapesBy([id('zig')], Math.PI / 4)
		const before = rect('zig')
		const grown = applyOps(editor, [{ op: 'resize', target: 'zig', w: before.w * 2 }])
		expect(grown.errors).toEqual([])
		expect(grown.results[0].adjusted).toBe('scaled evenly, since it is rotated')
		const after = rect('zig')
		expect(after.w).toBeCloseTo(before.w * 2, 0)
		expect(after.h).toBeCloseTo(before.h * 2, 0)
		expect(after.x).toBeCloseTo(before.x, 0)
		expect(after.y).toBeCloseTo(before.y, 0)

		const stretched = applyOps(editor, [
			{ op: 'resize', target: 'zig', w: after.w * 2, h: after.h },
		])
		expect(stretched.errors[0]).toMatch(/rotated, so it can only be scaled evenly/)
		expect(rect('zig')).toEqual(after)

		const centred = applyOps(editor, [
			{ op: 'resize', target: 'zig', scale: 0.5, anchor: 'center' },
		])
		expect(centred.errors).toEqual([])
		expect(rect('zig').w).toBeCloseTo(after.w / 2, 0)
		expect(rect('zig').center.x).toBeCloseTo(after.center.x, 0)
		expect(rect('zig').center.y).toBeCloseTo(after.center.y, 0)
	})
})

describe('paths and duplicates', () => {
	it('creates paths at their page coordinates, stamped with attribution', () => {
		const result = applyOps(
			editor,
			[
				{
					op: 'path',
					id: 'wave',
					smooth: true,
					points: [
						{ x: 30, y: 150 },
						{ x: 100, y: 80 },
						{ x: 200, y: 230 },
						{ x: 370, y: 150 },
					],
				},
				{
					op: 'path',
					id: 'island',
					closed: true,
					fill: 'semi',
					points: [
						{ x: 600, y: 0 },
						{ x: 800, y: 70 },
						{ x: 700, y: 260 },
					],
				},
			],
			{ userId: 'agent' }
		)
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLLineShape>(id('wave'))).toMatchObject({
			x: 30,
			y: 80,
			meta: { agent: { userId: 'agent' } },
		})
		expect(editor.getShape(id('island'))?.type).toBe('draw')
	})

	it('duplicates a box with its style and replacement text, and rejects arrows', () => {
		seed([
			{
				type: 'create_shape',
				id: 'source',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 220,
				h: 140,
				color: 'blue',
				size: 's',
				text: 'Original',
			},
			{ type: 'create_arrow', id: 'arrow', from: { x: 0, y: 300 }, to: { x: 200, y: 400 } },
		])
		const result = applyOps(editor, [
			{ op: 'duplicate', subject: 'source', id: 'copy', at: { x: 400, y: 0 }, text: 'Copy' },
			{ op: 'duplicate', subject: 'arrow', at: { x: 500, y: 300 } },
		])
		const copy = editor.getShape<TLGeoShape>(id('copy'))!
		expect(copy).toMatchObject({
			x: 400,
			y: 0,
			props: { w: 220, h: 140, color: 'blue', size: 's' },
		})
		expect(editor.getShapeUtil(copy).getText(copy)).toBe('Copy')
		expect(result.errors).toEqual([expect.stringContaining('not groups or arrows')])
	})
})

describe('batches', () => {
	it('rolls back an op that fails partway and keeps the rest', () => {
		seedDiagram()
		seed([
			{
				type: 'create_shape',
				id: 'api2',
				geo: 'rectangle',
				x: 100,
				y: 600,
				w: 200,
				h: 100,
				text: 'API v2',
			},
		])
		const result = applyOps(editor, [
			// The update applies, then the ambiguous target throws.
			{ op: 'place', subject: 'db', color: 'red', relation: 'below', target: { text: 'AP' } },
			{ op: 'restyle', targets: ['n1'], color: 'blue' },
		])
		expect(result.results.map((r) => r.ok)).toEqual([false, true])
		expect(editor.getShape<TLGeoShape>(id('db'))!.props.color).toBe('green')
		expect(editor.getShape<TLGeoShape>(id('n1'))!.props.color).toBe('blue')
		// The rolled-back half-edit must not come back through the undo stack either.
		editor.undo()
		editor.redo()
		expect(editor.getShape<TLGeoShape>(id('db'))!.props.color).toBe('green')
	})

	it('keeps { created } refs to the shapes this run made', () => {
		applyOps(editor, [{ op: 'add', kind: 'box', text: 'Other', id: 'other', at: { x: 0, y: 0 } }], {
			runId: 'other-run',
		})
		applyOps(editor, [{ op: 'add', kind: 'box', text: 'Mine', id: 'mine', at: { x: 0, y: 300 } }], {
			runId: 'run',
		})
		applyOps(editor, [{ op: 'remove', targets: { created: 'all' } }], { runId: 'run' })
		expect(editor.getShape(id('other'))).toBeDefined()
		expect(editor.getShape(id('mine'))).toBeUndefined()
	})

	it('a batch is one undo step', () => {
		seedDiagram()
		const before = editor.getCurrentPageShapeIds()
		applyOps(editor, [
			{ op: 'add', kind: 'label', text: 'One', at: { x: 0, y: 700 } },
			{ op: 'add', kind: 'label', text: 'Two', at: { x: 200, y: 700 } },
		])
		expect(editor.getCurrentPageShapeIds().size).toBe(before.size + 2)
		editor.undo()
		expect(editor.getCurrentPageShapeIds()).toEqual(before)
	})

	it('resolves { created } refs across batches from the same run', () => {
		applyOps(editor, [{ op: 'add', kind: 'box', text: 'A', id: 'a', at: { x: 0, y: 0 } }], {
			runId: 'run',
		})
		const next = applyOps(
			editor,
			[{ op: 'add', kind: 'label', text: 'under A', id: 'under', target: { created: 'last' } }],
			{ runId: 'run' }
		)
		expect(next.errors).toEqual([])
		expect(rect('under').y).toBeGreaterThan(rect('a').y + rect('a').h)
	})
})

describe('receiver', () => {
	it('validates the whole batch before applying any of it', () => {
		const receiver = createCanvasOpsReceiver(editor)
		expect(() =>
			receiver.applyBatch({
				ops: [{ op: 'add', text: 'ok', at: { x: 0, y: 0 } }, { op: 'explode' }],
			})
		).toThrow()
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
	})

	// One shape out there makes the page's bounds useless for everyone on the board.
	it('refuses a position far outside the page', () => {
		const receiver = createCanvasOpsReceiver(editor)
		expect(() =>
			receiver.applyBatch({ ops: [{ op: 'add', text: 'far', at: { x: 1e300, y: 0 } }] })
		).toThrow()
	})
})
