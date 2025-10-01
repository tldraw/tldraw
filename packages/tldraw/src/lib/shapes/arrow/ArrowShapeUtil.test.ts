import { HALF_PI, TLArrowShape, TLShapeId, createShapeId, toRichText } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { createOrUpdateArrowBinding, getArrowBindings, getArrowInfo } from './shared'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	arrow1: createShapeId('arrow1'),
}

vi.useFakeTimers()

window.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

window.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

function arrow(id = ids.arrow1) {
	return editor.getShape(id) as TLArrowShape
}
function bindings(id = ids.arrow1) {
	return getArrowBindings(editor, arrow(id))
}

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
		])

	createOrUpdateArrowBinding(editor, ids.arrow1, ids.box1, {
		terminal: 'start',
		isExact: false,
		isPrecise: false,
		normalizedAnchor: { x: 0.5, y: 0.5 },
		snap: 'none',
	})

	createOrUpdateArrowBinding(editor, ids.arrow1, ids.box2, {
		terminal: 'end',
		isExact: false,
		isPrecise: false,
		normalizedAnchor: { x: 0.5, y: 0.5 },
		snap: 'none',
	})
})

describe('When translating a bound shape', () => {
	it('updates the arrow when straight', () => {
		editor.select(ids.box2)
		editor.pointerDown(250, 250, { target: 'shape', shape: editor.getShape(ids.box2) })
		editor.pointerMove(300, 300) // move box 2 by 50, 50
		editor.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		editor.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 150,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
			},
		})
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
			end: {
				toId: ids.box2,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
	})

	it('updates the arrow when curved', () => {
		editor.updateShapes([{ id: ids.arrow1, type: 'arrow', props: { bend: 20 } }])
		editor.select(ids.box2)
		editor.pointerDown(250, 250, { target: 'shape', shape: editor.getShape(ids.box2) })
		editor.pointerMove(300, 300) // move box 2 by 50, 50
		editor.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		editor.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 150,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
				bend: 20,
			},
		})
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
			end: {
				toId: ids.box2,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
	})
})

describe('When translating the arrow', () => {
	it('retains all handles if either bound shape is also translating', () => {
		editor.select(ids.arrow1, ids.box2)
		expect(editor.getSelectionPageBounds()).toMatchObject({
			x: 200,
			y: 200,
			w: 200,
			h: 200,
		})
		editor.pointerDown(300, 300, { target: 'selection' })
		editor.pointerMove(300, 250)
		editor.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 100,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
			},
		})
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
			end: {
				toId: ids.box2,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
	})
})

describe('Other cases when arrow are moved', () => {
	it('nudge', () => {
		editor.select(ids.arrow1, ids.box2)

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 0, y: -1 })
		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: false } },
			end: { toId: ids.box2, props: { isPrecise: false } },
		})

		// when only the arrow is selected, we keep the binding but make it precise:
		editor.select(ids.arrow1)
		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 0, y: -1 })

		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: true } },
			end: { toId: ids.box2, props: { isPrecise: true } },
		})
	})

	it('align', () => {
		editor.createShapes([{ id: ids.box3, type: 'geo', x: 500, y: 300, props: { w: 100, h: 100 } }])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.select(ids.arrow1, ids.box2, ids.box3)
		editor.alignShapes(editor.getSelectedShapeIds(), 'right')
		vi.advanceTimersByTime(1000)

		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: false } },
			end: { toId: ids.box2, props: { isPrecise: false } },
		})

		// maintains bindings if they would still be over the same shape (but makes them precise), but unbinds others
		editor.select(ids.arrow1, ids.box3)
		editor.alignShapes(editor.getSelectedShapeIds(), 'top')
		vi.advanceTimersByTime(1000)

		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: true } },
			end: undefined,
		})
	})

	it('distribute', () => {
		editor.createShapes([
			{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
		])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.select(ids.arrow1, ids.box2, ids.box3)
		editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
		vi.advanceTimersByTime(1000)

		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: false } },
			end: { toId: ids.box2, props: { isPrecise: false } },
		})

		// unbinds when only the arrow is selected (not its bound shapes) if the arrow itself has moved
		editor.select(ids.arrow1, ids.box3, ids.box4)
		editor.distributeShapes(editor.getSelectedShapeIds(), 'vertical')
		vi.advanceTimersByTime(1000)

		// The arrow didn't actually move
		expect(bindings()).toMatchObject({
			start: { toId: ids.box1, props: { isPrecise: false } },
			end: { toId: ids.box2, props: { isPrecise: false } },
		})

		// The arrow will not move because it is still bound to another shape
		editor.updateShapes([{ id: ids.box4, type: 'geo', y: -600 }])
		editor.distributeShapes(editor.getSelectedShapeIds(), 'vertical')
		vi.advanceTimersByTime(1000)

		expect(bindings()).toMatchObject({
			start: undefined,
			end: undefined,
		})
	})

	it('when translating with a group that the arrow is bound into', () => {
		// create shapes in a group:
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes([
				{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
				{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
			])
			.selectAll()
			.groupShapes(editor.getSelectedShapeIds())

		editor.setCurrentTool('arrow').pointerDown(1000, 1000).pointerMove(50, 350).pointerUp(50, 350)
		const arrowId = editor.getOnlySelectedShape()!.id
		expect(bindings(arrowId).end?.toId).toBe(ids.box3)

		// translate:
		editor.selectAll().nudgeShapes(editor.getSelectedShapeIds(), { x: 0, y: 1 })

		// arrow should still be bound to box3
		expect(bindings(arrowId).end?.toId).toBe(ids.box3)
	})
})

describe('When a shape is rotated', () => {
	it('binds correctly', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(375, 375)
		const arrowId = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1].id

		expect(bindings(arrowId)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box2,
				props: {
					normalizedAnchor: { x: 0.75, y: 0.75 }, // moving slowly
				},
			},
		})

		editor.updateShapes([{ id: ids.box2, type: 'geo', rotation: HALF_PI }])
		editor.pointerMove(225, 350)

		expect(bindings(arrowId)).toCloselyMatchObject({
			start: undefined,
			end: {
				toId: ids.box2,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.75 }, // moving slowly
				},
			},
		})
	})
})

describe('Arrow labels', () => {
	beforeEach(() => {
		// Create an arrow with a label
		editor.setCurrentTool('arrow').pointerDown(10, 10).pointerMove(100, 100).pointerUp()
		const arrowId = editor.getOnlySelectedShape()!.id
		editor.updateShapes<TLArrowShape>([
			{ id: arrowId, type: 'arrow', props: { richText: toRichText('Test Label') } },
		])
	})

	it('should create an arrow with a label', () => {
		const arrowId = editor.getOnlySelectedShape()!.id
		expect(arrow(arrowId)).toMatchObject({
			props: {
				richText: toRichText('Test Label'),
			},
		})
	})

	it('should update the label of an arrow', () => {
		const arrowId = editor.getOnlySelectedShape()!.id
		editor.updateShapes<TLArrowShape>([
			{ id: arrowId, type: 'arrow', props: { richText: toRichText('New Label') } },
		])
		expect(arrow(arrowId)).toMatchObject({
			props: {
				richText: toRichText('New Label'),
			},
		})
	})
})

describe('resizing', () => {
	it('resizes', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('arrow')
			.pointerDown(0, 0)
			.pointerMove(200, 200)
			.pointerUp()
			.setCurrentTool('arrow')
			.pointerDown(100, 100)
			.pointerMove(300, 300)
			.pointerUp()
			.setCurrentTool('select')

		const arrow1 = editor.getCurrentPageShapes().at(-2)!
		const arrow2 = editor.getCurrentPageShapes().at(-1)!

		editor
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600)

			.expectToBeIn('select.resizing')

		expect(editor.getShape(arrow1.id)).toMatchObject({
			x: 0,
			y: 0,
			props: {
				start: {
					x: 0,
					y: 0,
				},
				end: {
					x: 200,
					y: 400,
				},
			},
		})

		expect(editor.getShape(arrow2.id)).toMatchObject({
			x: 100,
			y: 200,
			props: {
				start: {
					x: 0,
					y: 0,
				},
				end: {
					x: 200,
					y: 400,
				},
			},
		})
	})

	it('flips bend when flipping x or y', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('arrow')
			.pointerDown(0, 0)
			.pointerMove(200, 200)
			.pointerUp()
			.setCurrentTool('arrow')
			.pointerDown(100, 100)
			.pointerMove(300, 300)
			.pointerUp()
			.setCurrentTool('select')

		const arrow1 = editor.getCurrentPageShapes().at(-2)!
		const arrow2 = editor.getCurrentPageShapes().at(-1)!

		editor.updateShapes([{ id: arrow1.id, type: 'arrow', props: { bend: 50 } }])

		editor
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, -300)

			.expectToBeIn('select.resizing')

		expect(editor.getShape(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: -50,
			},
		})

		expect(editor.getShape(arrow2.id)).toCloselyMatchObject({
			props: {
				bend: 0,
			},
		})

		editor.pointerMove(150, 300)

		expect(editor.getShape(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: 50,
			},
		})

		expect(editor.getShape(arrow2.id)).toCloselyMatchObject({
			props: {
				bend: 0,
			},
		})
	})
})

describe("an arrow's parents", () => {
	// Frame
	// ┌───────────────────┐
	// │ ┌────┐            │ ┌────┐
	// │ │ A  │            │ │ C  │
	// │ └────┘            │ └────┘
	// │                   │
	// │                   │
	// │ ┌────┐            │
	// │ │ B  │            │
	// │ └────┘            │
	// └───────────────────┘
	let frameId: TLShapeId
	let boxAid: TLShapeId
	let boxBid: TLShapeId
	let boxCid: TLShapeId

	beforeEach(() => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		editor.setCurrentTool('frame')
		editor.pointerDown(0, 0).pointerMove(100, 100).pointerUp()
		frameId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('geo')
		editor.pointerDown(10, 10).pointerMove(20, 20).pointerUp()
		boxAid = editor.getOnlySelectedShape()!.id
		editor.setCurrentTool('geo')
		editor.pointerDown(10, 80).pointerMove(20, 90).pointerUp()
		boxBid = editor.getOnlySelectedShape()!.id
		editor.setCurrentTool('geo')
		editor.pointerDown(110, 10).pointerMove(120, 20).pointerUp()
		boxCid = editor.getOnlySelectedShape()!.id
	})

	it("are updated when the arrow's bound shapes change", () => {
		// draw arrow from a to empty space within frame, but don't pointer up yet
		editor.setCurrentTool('arrow')
		editor.pointerDown(15, 15).pointerMove(50, 50)
		const arrowId = editor.getOnlySelectedShape()!.id

		expect(arrow(arrowId).parentId).toBe(editor.getCurrentPageId())

		// move arrow to b
		editor.pointerMove(15, 85)
		expect(arrow(arrowId).parentId).toBe(frameId)
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: boxBid },
		})

		// move back to empty space
		editor.pointerMove(50, 50)
		expect(arrow(arrowId).parentId).toBe(editor.getCurrentPageId())
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: frameId },
		})
	})

	it('reparents when one of the shapes is moved outside of the frame', () => {
		// draw arrow from a to b
		editor.setCurrentTool('arrow')
		editor.pointerDown(15, 15).pointerMove(15, 85).pointerUp()
		const arrowId = editor.getOnlySelectedShape()!.id

		expect(arrow(arrowId)).toMatchObject({
			parentId: frameId,
		})
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: boxBid },
		})
		// move b outside of frame
		editor.select(boxBid).translateSelection(200, 0)
		expect(arrow(arrowId)).toMatchObject({
			parentId: editor.getCurrentPageId(),
		})
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: boxBid },
		})
	})

	it('reparents to the frame when an arrow created outside has both its parents moved inside', () => {
		// draw arrow from a to c
		editor.setCurrentTool('arrow')
		editor.pointerDown(15, 15).pointerMove(115, 15).pointerUp()
		const arrowId = editor.getOnlySelectedShape()!.id
		expect(arrow(arrowId)).toMatchObject({
			parentId: editor.getCurrentPageId(),
		})
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: boxCid },
		})

		// move c inside of frame
		editor.select(boxCid).translateSelection(-40, 0)

		expect(editor.getShape(arrowId)).toMatchObject({
			parentId: frameId,
		})
		expect(bindings(arrowId)).toMatchObject({
			start: { toId: boxAid },
			end: { toId: boxCid },
		})
	})
})

describe('Arrow export bounds', () => {
	it('excludes labels from shape bounds for export', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create shapes for the arrow to bind to
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
		])

		// Create an arrow with a label
		editor.createShapes([
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 0,
				y: 0,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: 100 },
					richText: toRichText('Test Label'),
				},
			},
		])

		// Get the page bounds (should exclude labels due to excludeFromShapeBounds flag)
		const pageBounds = editor.getShapePageBounds(ids.arrow1)
		expect(pageBounds).toBeDefined()

		// The bounds should be smaller than if labels were included
		// Since the arrow has a label that's excluded, the bounds should be minimal
		expect(pageBounds!.width).toBeLessThan(200) // Should not include label width
		expect(pageBounds!.height).toBeLessThan(200) // Should not include label height

		// Verify that the arrow has a label (which should be excluded from shape bounds)
		const arrow = editor.getShape(ids.arrow1) as TLArrowShape
		expect(arrow.props.richText).toBeDefined()
		expect(arrow.props.richText).not.toBeNull()
	})
})

describe('Arrow terminal positioning bug fix', () => {
	const data = {
		document: {
			store: {
				'shape:1Hm61DGAsY0uqEO-kt75l': {
					x: 637.2890625,
					y: 383.9296875,
					rotation: 0,
					isLocked: false,
					opacity: 1,
					meta: {},
					id: 'shape:1Hm61DGAsY0uqEO-kt75l',
					type: 'geo',
					props: {
						w: 230.66796875,
						h: 114.796875,
						geo: 'rectangle',
						dash: 'draw',
						growY: 0,
						url: '',
						scale: 1,
						color: 'black',
						labelColor: 'black',
						fill: 'none',
						size: 'm',
						font: 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						richText: {
							type: 'doc',
							content: [
								{
									type: 'paragraph',
								},
							],
						},
					},
					parentId: 'page:page',
					index: 'a1',
					typeName: 'shape',
				},
				'binding:nekxhMCGaoEJO98DEqWgo': {
					meta: {},
					id: 'binding:nekxhMCGaoEJO98DEqWgo',
					type: 'arrow',
					fromId: 'shape:j0HKQihjBXqMqgVhfRhDS',
					toId: 'shape:1Hm61DGAsY0uqEO-kt75l',
					props: {
						isPrecise: true,
						isExact: false,
						normalizedAnchor: {
							x: 0.13182672605036325,
							y: 0.8036953858717844,
						},
						snap: 'none',
						terminal: 'start',
					},
					typeName: 'binding',
				},
				'binding:kWamalL_QSq_kFPZDgp7Z': {
					meta: {},
					id: 'binding:kWamalL_QSq_kFPZDgp7Z',
					type: 'arrow',
					fromId: 'shape:j0HKQihjBXqMqgVhfRhDS',
					toId: 'shape:1Hm61DGAsY0uqEO-kt75l',
					props: {
						isPrecise: true,
						isExact: false,
						normalizedAnchor: {
							x: 0.7138744475114731,
							y: 0.45797604464407243,
						},
						snap: 'none',
						terminal: 'end',
					},
					typeName: 'binding',
				},
				'shape:j0HKQihjBXqMqgVhfRhDS': {
					x: 665.296875,
					y: 477.59765625,
					rotation: 0,
					isLocked: false,
					opacity: 1,
					meta: {},
					id: 'shape:j0HKQihjBXqMqgVhfRhDS',
					type: 'arrow',
					props: {
						kind: 'arc',
						elbowMidPoint: 0.5,
						dash: 'draw',
						size: 'm',
						fill: 'none',
						color: 'black',
						labelColor: 'black',
						bend: 0,
						start: {
							x: 0,
							y: 0,
						},
						end: {
							x: 2,
							y: 0,
						},
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
						richText: {
							type: 'doc',
							content: [
								{
									type: 'paragraph',
								},
							],
						},
						labelPosition: 0.5,
						font: 'draw',
						scale: 1,
					},
					parentId: 'page:page',
					index: 'a2lbpzZG',
					typeName: 'shape',
				},
				'page:page': {
					meta: {},
					id: 'page:page',
					name: 'Page 1',
					index: 'a1',
					typeName: 'page',
				},
				'document:document': {
					gridSize: 10,
					name: '',
					meta: {},
					id: 'document:document',
					typeName: 'document',
				},
			},
			schema: {
				schemaVersion: 2,
				sequences: {
					'com.tldraw.store': 5,
					'com.tldraw.asset': 1,
					'com.tldraw.camera': 1,
					'com.tldraw.document': 2,
					'com.tldraw.instance': 25,
					'com.tldraw.instance_page_state': 5,
					'com.tldraw.page': 1,
					'com.tldraw.instance_presence': 6,
					'com.tldraw.pointer': 1,
					'com.tldraw.shape': 4,
					'com.tldraw.asset.bookmark': 2,
					'com.tldraw.asset.image': 5,
					'com.tldraw.asset.video': 5,
					'com.tldraw.shape.group': 0,
					'com.tldraw.shape.text': 3,
					'com.tldraw.shape.bookmark': 2,
					'com.tldraw.shape.draw': 2,
					'com.tldraw.shape.geo': 10,
					'com.tldraw.shape.note': 9,
					'com.tldraw.shape.line': 5,
					'com.tldraw.shape.frame': 1,
					'com.tldraw.shape.arrow': 7,
					'com.tldraw.shape.highlight': 1,
					'com.tldraw.shape.embed': 4,
					'com.tldraw.shape.image': 5,
					'com.tldraw.shape.video': 4,
					'com.tldraw.binding.arrow': 1,
				},
			},
		},
		session: {
			version: 0,
			currentPageId: 'page:page',
			exportBackground: true,
			isFocusMode: false,
			isDebugMode: false,
			isToolLocked: false,
			isGridMode: false,
			pageStates: [
				{
					pageId: 'page:page',
					camera: {
						x: 0,
						y: 0,
						z: 1,
					},
					selectedShapeIds: ['shape:j0HKQihjBXqMqgVhfRhDS'],
					focusedGroupId: null,
				},
			],
		},
	}

	it('should position straight arrow terminals on shape boundary, not text label boundary', () => {
		// Create a geo shape with text label
		editor.loadSnapshot(data as any)

		const arrow = editor.getShape('shape:j0HKQihjBXqMqgVhfRhDS' as TLShapeId) as TLArrowShape
		expect(arrow).toBeDefined()

		expect(getArrowBindings(editor, arrow)).toMatchObject({
			end: { props: { isPrecise: true } },
			start: { props: { isPrecise: true } },
		})

		const info = getArrowInfo(editor, arrow)
		expect(info?.start.handle).toEqual(info?.start.point)
		expect(info?.end.handle).toEqual(info?.end.point)
	})
})
