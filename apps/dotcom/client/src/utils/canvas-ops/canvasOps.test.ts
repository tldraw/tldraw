import { createShapeId, Editor, type Box, type TLGeoShape, type TLLineShape } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { describeShapes, runBatch } from './actions'
import { createCanvasOpsReceiver } from './index'
import { applyOps } from './ops'
import type { CanvasAction } from './schema'
import { createTestEditor } from './testEditor'

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
	it('resolves ids, text, descriptions, and the selection', async () => {
		seedDiagram()
		editor.select(id('heart'))
		const result = await applyOps(editor, [
			{ op: 'restyle', targets: [{ text: 'database' }], color: 'blue' },
			{ op: 'restyle', targets: [{ description: 'the box labelled "API"' }], color: 'orange' },
			{ op: 'restyle', targets: { selected: true }, color: 'black' },
		])
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLGeoShape>(id('db'))!.props.color).toBe('blue')
		expect(editor.getShape<TLGeoShape>(id('api'))!.props.color).toBe('orange')
		expect(editor.getShape<TLGeoShape>(id('heart'))!.props.color).toBe('black')
	})

	it('reports an ambiguous description as an op error and still runs the rest', async () => {
		seedDiagram()
		const result = await applyOps(editor, [
			{ op: 'remove', targets: [{ description: 'the box' }] },
			{ op: 'remove', targets: ['n1'] },
		])
		expect(result.errors).toEqual([expect.stringMatching(/^Op 0 \(remove\): 2 shapes match/)])
		expect(result.applied).toBe(1)
		expect(editor.getShape(id('n1'))).toBeUndefined()
	})
})

describe('add, place, and label', () => {
	it('places a new label above a target, centred, measuring the real text width', async () => {
		seedDiagram()
		const result = await applyOps(editor, [
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
		expect(result.compiled.map((a) => a.type)).toEqual(['create_text', 'update_shape'])
	})

	it('moves an existing shape right of another and nudges when the spot is taken', async () => {
		seedDiagram()
		seed([{ type: 'create_shape', id: 'blocker', geo: 'rectangle', x: 324, y: 110, w: 80, h: 80 }])
		const result = await applyOps(editor, [
			{ op: 'place', subject: 'n1', relation: 'right_of', target: 'api', gap: 24, align: 'start' },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].adjusted).toMatch(/nudged|instead/)
		expect(overlap(rect('n1'), rect('blocker'))).toBe(false)
	})

	it('a new box beside a box takes its style and footprint', async () => {
		seedDiagram()
		const result = await applyOps(editor, [
			{ op: 'add', kind: 'box', text: 'Cache', id: 'cache', relation: 'below', target: 'db' },
		])
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLGeoShape>(id('cache'))!.props).toMatchObject({
			color: 'green',
			w: 200,
			h: 100,
		})
	})

	it('label with an arrow to a point lands the tip on the point', async () => {
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
		const result = await applyOps(editor, [
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

	it('centres a fitting label inside an empty shape and omits the arrow', async () => {
		seed([{ type: 'create_shape', id: 'region', geo: 'rectangle', x: 100, y: 100, w: 300, h: 160 }])
		const result = await applyOps(editor, [
			{ op: 'label', target: 'region', text: 'North', arrow: true, id: 'north' },
		])
		expect(result.errors).toEqual([])
		expect(result.results[0].message).toMatch(/centred inside region.*without an arrow/)
		expect(rect('north').center.x).toBeCloseTo(rect('region').center.x)
		expect(rect('north').center.y).toBeCloseTo(rect('region').center.y)
		expect(describeShapes(editor).some((s) => s.type === 'arrow')).toBe(false)
	})
})

describe('ops do what they say', () => {
	it('keeps an explicit width, white text, and text in a small box', async () => {
		const result = await applyOps(
			editor,
			[
				{
					op: 'add',
					kind: 'box',
					id: 'narrow',
					text: 'A long label here',
					w: 80,
					h: 40,
					at: { x: 0, y: 0 },
				},
				{ op: 'add', kind: 'box', id: 'dot', text: 'x', w: 20, h: 20, at: { x: 300, y: 0 } },
				{
					op: 'add',
					kind: 'label',
					id: 'white',
					text: 'On dark',
					color: 'white',
					at: { x: 0, y: 200 },
				},
			],
			{ userId: 'agent' }
		)
		expect(result.errors).toEqual([])
		expect(editor.getShape<TLGeoShape>(id('narrow'))!.props.w).toBe(80)
		const dot = editor.getShape<TLGeoShape>(id('dot'))!
		expect(editor.getShapeUtil(dot).getText(dot)).toBe('x')
		expect(editor.getShape<TLGeoShape>(id('white'))!.props.color).toBe('white')
	})

	it('replacing an arrow by id is recorded in the batch', async () => {
		seedDiagram()
		await applyOps(editor, [{ op: 'connect', from: 'api', to: 'db', id: 'link' }])
		const result = await applyOps(editor, [{ op: 'connect', from: 'db', to: 'heart', id: 'link' }])
		expect(result.errors).toEqual([])
		expect(result.compiled.map((a) => a.type)).toEqual(['delete_shapes', 'create_arrow'])
	})
})

describe('connect', () => {
	it('binds an arrow between shapes', async () => {
		seedDiagram()
		const result = await applyOps(editor, [{ op: 'connect', from: 'api', to: 'db', id: 'link' }])
		expect(result.errors).toEqual([])
		const bindings = editor.getBindingsFromShape(id('link'), 'arrow').map((b) => b.toId)
		expect(bindings.sort()).toEqual([id('api'), id('db')].sort())
	})

	it('puts a label beside a short arrow instead of hiding its shaft', async () => {
		const result = await applyOps(editor, [
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

	it('keeps a label on a long arrow', async () => {
		const result = await applyOps(editor, [
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
	it('resizes about the centre inside a frame without jumping by the frame offset', async () => {
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
		const result = await applyOps(editor, [
			{ op: 'resize', target: 'box', scale: 2, anchor: 'center' },
		])
		expect(result.errors).toEqual([])
		expect(rect('box')).toMatchObject({ x: 550, y: 550, w: 200, h: 200 })
	})

	it('refuses to resize a line instead of reporting a no-op as done', async () => {
		const made = await applyOps(editor, [
			{
				op: 'path',
				id: 'ln',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
				],
			},
		])
		expect(made.errors).toEqual([])
		const result = await applyOps(editor, [{ op: 'resize', target: 'ln', scale: 2 }])
		expect(result.errors).toEqual([expect.stringContaining('does not support line')])
	})

	it('rename widens a box so a long label stays one line', async () => {
		seedDiagram()
		const result = await applyOps(editor, [
			{ op: 'rename', target: 'api', text: 'Application programming interface' },
		])
		expect(result.results[0].adjusted).toMatch(/widened.*now overlaps db/)
		expect(rect('api').w).toBeGreaterThan(400)
		expect(rect('api').h).toBe(100)
	})

	it('restyle like another shape and resize about the centre', async () => {
		seedDiagram()
		await applyOps(editor, [
			{ op: 'restyle', targets: ['api'], like: 'db' },
			{ op: 'resize', target: 'db', scale: 2, anchor: 'center' },
		])
		expect(editor.getShape<TLGeoShape>(id('api'))!.props.color).toBe('green')
		expect(rect('db')).toMatchObject({ x: 400, y: 50, w: 400, h: 200 })
	})

	it('untangle spreads overlapping labels while keeping them near their dots', async () => {
		seed([
			{ type: 'create_shape', id: 'd1', geo: 'ellipse', x: 192, y: 192, w: 16, h: 16 },
			{ type: 'create_shape', id: 'd2', geo: 'ellipse', x: 222, y: 207, w: 16, h: 16 },
			{ type: 'create_text', id: 'l1', text: 'Mercury', x: 204, y: 186 },
			{ type: 'create_text', id: 'l2', text: 'Venus', x: 234, y: 201 },
		])
		const result = await applyOps(editor, [
			{ op: 'untangle', targets: ['l1', 'l2'], keepNear: ['d1', 'd2'], maxDistance: 60 },
		])
		expect(result.errors).toEqual([])
		expect(overlap(rect('l1'), rect('l2'))).toBe(false)
		expect(Math.hypot(rect('l1').center.x - 200, rect('l1').center.y - 200)).toBeLessThan(120)
	})
})

describe('paths and duplicates', () => {
	it('creates paths at their page coordinates, stamped with attribution', async () => {
		const result = await applyOps(
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

	it('duplicates a box with its style and replacement text, and rejects arrows', async () => {
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
		const result = await applyOps(editor, [
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
	it('rolls back an op that fails partway and keeps the rest', async () => {
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
		const result = await applyOps(editor, [
			// The update applies, then the ambiguous target throws.
			{ op: 'place', subject: 'db', color: 'red', relation: 'below', target: { text: 'AP' } },
			{ op: 'restyle', targets: ['n1'], color: 'blue' },
		])
		expect(result.results.map((r) => r.ok)).toEqual([false, true])
		expect(editor.getShape<TLGeoShape>(id('db'))!.props.color).toBe('green')
		expect(result.compiled).toEqual([
			{
				type: 'update_shape',
				shapeId: 'n1',
				color: 'blue',
				fill: undefined,
				dash: undefined,
				size: undefined,
			},
		])
	})

	it('keeps { created } refs to the shapes this run made', async () => {
		await applyOps(
			editor,
			[{ op: 'add', kind: 'box', text: 'Other', id: 'other', at: { x: 0, y: 0 } }],
			{ runId: 'other-run' }
		)
		await applyOps(
			editor,
			[{ op: 'add', kind: 'box', text: 'Mine', id: 'mine', at: { x: 0, y: 300 } }],
			{ runId: 'run' }
		)
		await applyOps(editor, [{ op: 'remove', targets: { created: 'all' } }], { runId: 'run' })
		expect(editor.getShape(id('other'))).toBeDefined()
		expect(editor.getShape(id('mine'))).toBeUndefined()
	})

	it('a batch is one undo step', async () => {
		seedDiagram()
		const before = editor.getCurrentPageShapeIds()
		await applyOps(editor, [
			{ op: 'add', kind: 'label', text: 'One', at: { x: 0, y: 700 } },
			{ op: 'add', kind: 'label', text: 'Two', at: { x: 200, y: 700 } },
		])
		expect(editor.getCurrentPageShapeIds().size).toBe(before.size + 2)
		editor.undo()
		expect(editor.getCurrentPageShapeIds()).toEqual(before)
	})

	it('resolves { created } refs across batches from the same run', async () => {
		await applyOps(editor, [{ op: 'add', kind: 'box', text: 'A', id: 'a', at: { x: 0, y: 0 } }], {
			runId: 'run',
		})
		const next = await applyOps(
			editor,
			[{ op: 'add', kind: 'label', text: 'under A', id: 'under', target: { created: 'last' } }],
			{ runId: 'run' }
		)
		expect(next.errors).toEqual([])
		expect(rect('under').y).toBeGreaterThan(rect('a').y + rect('a').h)
	})
})

describe('receiver', () => {
	it('validates the whole batch before applying any of it', async () => {
		const receiver = createCanvasOpsReceiver(editor)
		await expect(
			receiver.applyBatch({
				ops: [{ op: 'add', text: 'ok', at: { x: 0, y: 0 } }, { op: 'explode' }],
			})
		).rejects.toThrow()
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
	})
})
