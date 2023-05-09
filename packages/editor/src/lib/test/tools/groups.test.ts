import { approximately, Box2d, VecLike } from '@tldraw/primitives'
import {
	createCustomShapeId,
	TLArrowShape,
	TLGroupShape,
	TLLineShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
} from '@tldraw/tlschema'
import { assert, compact } from '@tldraw/utils'
import { TLArrowShapeDef } from '../../app/shapeutils/TLArrowUtil/TLArrowUtil'
import { TLGroupShapeDef, TLGroupUtil } from '../../app/shapeutils/TLGroupUtil/TLGroupUtil'
import { TLArrowTool } from '../../app/statechart/TLArrowTool/TLArrowTool'
import { TLDrawTool } from '../../app/statechart/TLDrawTool/TLDrawTool'
import { TLEraserTool } from '../../app/statechart/TLEraserTool/TLEraserTool'
import { TLLineTool } from '../../app/statechart/TLLineTool/TLLineTool'
import { TLNoteTool } from '../../app/statechart/TLNoteTool/TLNoteTool'
import { sortByIndex } from '../../utils/reordering/reordering'
import { TestApp } from '../TestApp'

let i = 0
jest.mock('nanoid', () => ({ nanoid: () => 'id' + i++ }))

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
	boxE: createCustomShapeId('boxE'),
	boxF: createCustomShapeId('boxF'),

	boxX: createCustomShapeId('boxX'),

	lineA: createCustomShapeId('lineA'),
}

const box = (id: TLShapeId, x: number, y: number, w = 10, h = 10): TLShapePartial => ({
	type: 'geo',
	id,
	x,
	y,
	// index: bumpIndex(),
	props: {
		w,
		h,
		fill: 'solid',
	},
})
const arrow = (id: TLShapeId, start: VecLike, end: VecLike): TLShapePartial => ({
	type: 'arrow',
	id,
	// index: bumpIndex(),
	props: {
		start: {
			type: 'point',
			x: start.x,
			y: start.y,
		},
		end: {
			type: 'point',
			x: end.x,
			y: end.y,
		},
	},
})
const randomRotation = () => Math.random() * Math.PI * 2
const randomCoord = () => Math.random() * 100 - 50
const randomSize = () => Math.random() * 99 + 1

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

const getAllShapes = () => app.shapesArray

const onlySelectedId = () => {
	expect(app.selectedIds).toHaveLength(1)
	return app.selectedIds[0]
}

const onlySelectedShape = () => {
	const id = onlySelectedId()
	return app.getShapeById(id)!
}

const children = (shape: TLShape) => {
	return new Set(compact(app.getSortedChildIds(shape.id).map((id) => app.getShapeById(id))))
}

const isRemoved = (shape: TLShape) => {
	return !app.getShapeById(shape.id)
}

describe('creating groups', () => {
	it('works if there are multiple shapes in the selection', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB)
		expect(getAllShapes()).toHaveLength(3)
		expect(app.selectedIds.length).toBe(2)

		app.groupShapes()

		expect(getAllShapes()).toHaveLength(4)
		expect(app.selectedIds.length).toBe(1)
		expect(app.getShapeById(ids.boxA)).toBeTruthy()
		expect(app.getShapeById(ids.boxB)).toBeTruthy()

		const group = onlySelectedShape()
		expect(group.type).toBe(TLGroupUtil.type)
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({ x: 0, y: 0, w: 30, h: 10 })
		expect(children(group).has(app.getShapeById(ids.boxA)!)).toBe(true)
		expect(children(group).has(app.getShapeById(ids.boxB)!)).toBe(true)
		expect(children(group).has(app.getShapeById(ids.boxC)!)).toBe(false)
	})
	it('does not work if there are zero or one shape in the selection ', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		expect(getAllShapes()).toHaveLength(3)
		app.groupShapes()
		expect(getAllShapes()).toHaveLength(3)
		app.select(ids.boxA)
		app.groupShapes()
		expect(getAllShapes()).toHaveLength(3)
		expect(onlySelectedId()).toBe(ids.boxA)
	})

	it('preserves the page positions and rotations of the grouped shapes', () => {
		for (let i = 0; i < 100; i++) {
			const shapes = [
				{
					...box(ids.boxA, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxB, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxC, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
			]
			app.createShapes(shapes)

			const initialPageBounds = {
				A: app.getPageBoundsById(ids.boxA)!.clone(),
				B: app.getPageBoundsById(ids.boxB)!.clone(),
				C: app.getPageBoundsById(ids.boxC)!.clone(),
			}

			const initialPageRotations = {
				A: app.getPageRotationById(ids.boxA),
				B: app.getPageRotationById(ids.boxB),
				C: app.getPageRotationById(ids.boxC),
			}

			app.select(ids.boxA, ids.boxB, ids.boxC)
			app.groupShapes()

			try {
				expect({
					A: app.getPageBoundsById(ids.boxA)!.clone(),
					B: app.getPageBoundsById(ids.boxB)!.clone(),
					C: app.getPageBoundsById(ids.boxC)!.clone(),
				}).toCloselyMatchObject(initialPageBounds)
				expect({
					A: app.getPageRotationById(ids.boxA),
					B: app.getPageRotationById(ids.boxB),
					C: app.getPageRotationById(ids.boxC),
				}).toCloselyMatchObject(initialPageRotations)
			} catch (e) {
				console.error('Failing nodes', JSON.stringify(shapes))
				throw e
			}
		}
	})
	it('works with nested groups', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxA, ids.boxB)
		app.groupShapes()

		const groupAId = onlySelectedId()

		app.select(ids.boxC, ids.boxD)
		app.groupShapes()

		const groupBId = onlySelectedId()

		app.select(groupAId, groupBId)
		app.groupShapes()

		const uberGroup = onlySelectedShape()
		expect(uberGroup.type).toBe(TLGroupUtil.type)
		expect(app.getPageBoundsById(uberGroup.id)!).toCloselyMatchObject({ x: 0, y: 0, w: 70, h: 10 })

		expect(children(uberGroup).size).toBe(2)
		expect(children(uberGroup).has(app.getShapeById(groupAId)!)).toBe(true)
		expect(children(uberGroup).has(app.getShapeById(groupBId)!)).toBe(true)
	})
	it('works with shapes inside individual nested groups', () => {
		//     0   10  20  30  40  50  60  70  80  90  100 110
		//
		//     ┌───┐           ┌───┐   ┌───┐           ┌───┐
		//     │ A │           │ C │   │ D │           │ F │
		// 10  └───┘           └───┘   └───┘           └───┘
		//
		// 20          ┌───┐                   ┌───┐
		//             │ B │                   │ E │
		// 30          └───┘                   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 20),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 80, 20),
			box(ids.boxF, 100, 0),
		])

		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		const groupA = onlySelectedShape()
		app.select(ids.boxD, ids.boxE, ids.boxF)
		app.groupShapes()
		const groupB = onlySelectedShape()

		app.select(ids.boxB, ids.boxE)
		app.groupShapes()
		const groupC = onlySelectedShape()

		expect(children(groupA).size).toBe(2)
		expect(children(groupB).size).toBe(2)
		expect(children(groupC).size).toBe(2)

		expect(groupA.parentId).toBe(app.currentPageId)
		expect(groupB.parentId).toBe(app.currentPageId)
		expect(groupC.parentId).toBe(app.currentPageId)

		expect(app.getShapeById(ids.boxA)!.parentId).toBe(groupA.id)
		expect(app.getShapeById(ids.boxC)!.parentId).toBe(groupA.id)

		expect(app.getShapeById(ids.boxB)!.parentId).toBe(groupC.id)
		expect(app.getShapeById(ids.boxE)!.parentId).toBe(groupC.id)

		expect(app.getShapeById(ids.boxD)!.parentId).toBe(groupB.id)
		expect(app.getShapeById(ids.boxF)!.parentId).toBe(groupB.id)
	})
	it('does not work if the scene is in readonly mode', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		app.updateUserDocumentSettings({ isReadOnly: true })
		app.selectAll()
		expect(app.selectedIds.length).toBe(3)
		app.groupShapes()
		expect(app.selectedIds.length).toBe(3)
	})
	it('keeps order correct simple', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxC, ids.boxB)
		app.groupShapes()

		const groupAId = onlySelectedId()
		const sortedGroupChildrenIds = app
			.getSortedChildIds(groupAId)
			.map((id) => app.getShapeById(id)!)
			.sort(sortByIndex)
			.map((shape) => shape.id)

		const sortedIds = app.getSortedChildIds(app.currentPageId)
		expect(sortedIds.length).toBe(3)
		expect(sortedIds[0]).toBe(ids.boxA)
		expect(sortedIds[1]).toBe(groupAId)
		expect(sortedIds[2]).toBe(ids.boxD)

		expect(sortedGroupChildrenIds.length).toBe(2)
		expect(sortedGroupChildrenIds[0]).toBe(ids.boxB)
		expect(sortedGroupChildrenIds[1]).toBe(ids.boxC)
	})

	it('keeps order correct complex', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxC, ids.boxA)
		app.groupShapes()

		const groupAId = onlySelectedId()

		const sortedGroupChildrenIds = app
			.getSortedChildIds(groupAId)
			.map((id) => app.getShapeById(id)!)
			.sort(sortByIndex)
			.map((shape) => shape.id)

		const sortedIds = app.getSortedChildIds(app.currentPageId)
		expect(sortedIds.length).toBe(3)
		expect(sortedIds[0]).toBe(ids.boxB)
		expect(sortedIds[1]).toBe(groupAId)
		expect(sortedIds[2]).toBe(ids.boxD)

		expect(sortedGroupChildrenIds.length).toBe(2)
		expect(sortedGroupChildrenIds[0]).toBe(ids.boxA)
		expect(sortedGroupChildrenIds[1]).toBe(ids.boxC)
	})
})

describe('ungrouping shapes', () => {
	it('works if there is one selected shape and that shape is a group', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB)
		app.groupShapes()

		const groupA = onlySelectedShape()

		app.ungroupShapes()

		expect(isRemoved(groupA)).toBe(true)
		expect(new Set(app.selectedIds)).toEqual(new Set([ids.boxA, ids.boxB]))

		expect(app.getPageBoundsById(ids.boxA)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 10,
		})

		expect(app.getPageBoundsById(ids.boxB)!).toCloselyMatchObject({
			x: 20,
			y: 0,
			w: 10,
			h: 10,
		})
	})
	it('selects the groups children and other non-group shapes on ungroup', () => {
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()

		const groupA = onlySelectedShape()

		app.select(groupA.id, ids.boxC)
		app.ungroupShapes()

		expect(new Set(app.selectedIds)).toMatchObject(new Set([ids.boxA, ids.boxB, ids.boxC]))
	})
	it('preserves the page positions and rotations of the ungrouped shapes', () => {
		for (let i = 0; i < 100; i++) {
			const shapes = [
				{
					...box(ids.boxA, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxB, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxC, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
			]

			app.createShapes(shapes)

			const initialPageBounds = {
				A: app.getPageBoundsById(ids.boxA)!.clone(),
				B: app.getPageBoundsById(ids.boxB)!.clone(),
				C: app.getPageBoundsById(ids.boxC)!.clone(),
			}

			const initialPageRotations = {
				A: app.getPageRotationById(ids.boxA),
				B: app.getPageRotationById(ids.boxB),
				C: app.getPageRotationById(ids.boxC),
			}

			app.select(ids.boxA, ids.boxB, ids.boxC)
			app.groupShapes()
			app.ungroupShapes()
			expect(app.selectedIds.length).toBe(3)

			try {
				expect({
					A: app.getPageBoundsById(ids.boxA)!.clone(),
					B: app.getPageBoundsById(ids.boxB)!.clone(),
					C: app.getPageBoundsById(ids.boxC)!.clone(),
				}).toCloselyMatchObject(initialPageBounds)
				expect({
					A: app.getPageRotationById(ids.boxA),
					B: app.getPageRotationById(ids.boxB),
					C: app.getPageRotationById(ids.boxC),
				}).toCloselyMatchObject(initialPageRotations)
			} catch (e) {
				console.error('Failing shapes', JSON.stringify(shapes))
				throw e
			}
		}
	})
	it('does not ungroup nested groups', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxA, ids.boxB)
		app.groupShapes()

		const groupAId = onlySelectedId()

		app.select(ids.boxC, ids.boxD)
		app.groupShapes()

		const groupBId = onlySelectedId()

		app.select(groupAId, groupBId)
		app.groupShapes()
		expect(app.selectedIds.length).toBe(1)
		app.ungroupShapes()
		expect(app.selectedIds.length).toBe(2)
		expect(app.getShapeById(groupAId)).not.toBe(undefined)
		expect(app.getShapeById(groupBId)).not.toBe(undefined)
	})
	it('does not work if the scene is in readonly mode', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		app.selectAll()
		expect(app.selectedIds.length).toBe(3)
		app.groupShapes()
		expect(app.selectedIds.length).toBe(1)

		app.updateUserDocumentSettings({ isReadOnly: true })
		app.ungroupShapes()
		expect(app.selectedIds.length).toBe(1)
		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
	})
	it('keeps order correct simple', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxC, ids.boxB)
		app.groupShapes()
		app.ungroupShapes()

		const sortedShapes = app.shapesArray.sort(sortByIndex).map((shape) => shape.id)
		expect(sortedShapes.length).toBe(4)
		expect(sortedShapes[0]).toBe(ids.boxA)
		expect(sortedShapes[1]).toBe(ids.boxB)
		expect(sortedShapes[2]).toBe(ids.boxC)
		expect(sortedShapes[3]).toBe(ids.boxD)
	})
	it('keeps order correct complex', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		app.select(ids.boxC, ids.boxA)
		app.groupShapes()
		app.ungroupShapes()

		const sortedShapes = app.shapesArray.sort(sortByIndex).map((shape) => shape.id)
		expect(sortedShapes.length).toBe(4)
		expect(sortedShapes[0]).toBe(ids.boxB)
		expect(sortedShapes[1]).toBe(ids.boxA)
		expect(sortedShapes[2]).toBe(ids.boxC)
		expect(sortedShapes[3]).toBe(ids.boxD)
	})
})

describe('the bounds of a group', () => {
	it('changes when the children rotate', () => {
		app.createShapes([
			box(ids.boxA, 0, 0, 100, 100),
			{
				id: ids.boxB,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					geo: 'ellipse',
					w: 100,
					h: 100,
				},
			},
		])

		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		const group = onlySelectedShape()

		expect(app.getPageBoundsById(group.id)!.minX).toBe(0)

		app.select(ids.boxA).rotateSelection(Math.PI / 4)

		// pythagoras to the rescue
		const expectedLeftBound = 50 - Math.sqrt(2 * (100 * 100)) / 2
		expect(app.getPageBoundsById(group.id)!.minX).toBeCloseTo(expectedLeftBound)

		// rotating the circle doesn't move the right edge because it's outline doesn't change
		expect(app.getPageBoundsById(group.id)!.maxX).toBe(300)
		app.select(ids.boxB).rotateSelection(Math.PI / 4)
		expect(approximately(app.getPageBoundsById(group.id)!.maxX, 300, 1)).toBe(true)
	})

	it('changes when shapes translate', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		const group = onlySelectedShape()

		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 50,
			h: 10,
		})

		// move A to the left
		app.select(ids.boxA).translateSelection(-10, 0)
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: 0,
			w: 60,
			h: 10,
		})
		// move C up and to the right
		app.select(ids.boxC).translateSelection(10, -10)
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 70,
			h: 20,
		})
	})

	it('changes when shapes resize', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		const group = onlySelectedShape()

		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 50,
			h: 10,
		})

		// resize A to the left
		app.select(ids.boxA).resizeSelection({ scaleX: 2 }, 'left')
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: 0,
			w: 60,
			h: 10,
		})
		// resize C up and to the right
		app.select(ids.boxC).resizeSelection({ scaleY: 2, scaleX: 2 }, 'top_right')
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 70,
			h: 20,
		})
	})
})

describe('the bounds of a rotated group', () => {
	it('changes when the children rotate', () => {
		app.createShapes([
			box(ids.boxA, 0, 0, 100, 100),
			{
				id: ids.boxB,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					geo: 'ellipse',
					w: 100,
					h: 100,
				},
			},
		])

		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		const group = onlySelectedShape()

		app.rotateSelection(Math.PI / 2)

		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 300,
			h: 300,
		})

		app.select(ids.boxA).rotateSelection(Math.PI / 4)

		// pythagoras to the rescue
		const expectedTopBound = 50 - Math.sqrt(2 * (100 * 100)) / 2
		expect(app.getPageBoundsById(group.id)!.minY).toBeCloseTo(expectedTopBound)

		// rotating the circle doesn't move the right edge because it's outline doesn't change
		expect(app.getPageBoundsById(group.id)!.maxY).toBe(300)
		app.select(ids.boxB).rotateSelection(Math.PI / 4)
		expect(approximately(app.getPageBoundsById(group.id)!.maxY, 300, 1)).toBe(true)
	})

	it('changes when shapes translate', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		// rotate this all 90 degrees
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		const group = onlySelectedShape()
		app.updateShapes([{ id: group.id, type: 'group', rotation: Math.PI / 2, x: 10, y: 0 }])

		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 50,
		})

		// move A up and to the left
		app.select(ids.boxA).translateSelection(-10, -10)
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 20,
			h: 60,
		})
		// move C up and to the right
		app.select(ids.boxC).translateSelection(10, -10)
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 30,
			h: 50,
		})
	})

	it('changes when shapes resize', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		// rotate this all 90 degrees
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		const group = onlySelectedShape()
		app.updateShapes([{ id: group.id, type: 'group', rotation: Math.PI / 2, x: 10, y: 0 }])

		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 50,
		})

		// resize A to up
		app.select(ids.boxA).resizeSelection({ scaleX: 2 }, 'left')
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 10,
			h: 60,
		})
		// resize C up and to the right
		app.select(ids.boxC).resizeSelection({ scaleY: 2, scaleX: 2 }, 'top_right')
		expect(app.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 20,
			h: 70,
		})
	})
})

describe('focus layers', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		groupCId = onlySelectedId()
		app.selectNone()
	})
	it('should adjust to the parent layer of any selected shape', () => {
		expect(app.focusLayerId).toBe(app.currentPageId)
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
		app.select(ids.boxB)
		expect(app.focusLayerId).toBe(groupAId)
		app.select(ids.boxC)
		expect(app.focusLayerId).toBe(groupBId)
		app.select(ids.boxD)
		expect(app.focusLayerId).toBe(groupBId)
		app.select(groupAId)
		expect(app.focusLayerId).toBe(groupCId)
	})
	it('should adjust to the common ancestor of selected shapes in multiple groups', () => {
		expect(app.focusLayerId).toBe(app.currentPageId)
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
		app.setSelectedIds([...app.selectedIds, ids.boxC])
		expect(app.focusLayerId).toBe(groupCId)
		app.deselect(ids.boxA)
		expect(app.focusLayerId).toBe(groupBId)
		app.setSelectedIds([...app.selectedIds, ids.boxB])
		expect(app.focusLayerId).toBe(groupCId)
	})
	it('should not adjust the focus layer when clearing the selection', () => {
		expect(app.focusLayerId).toBe(app.currentPageId)
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
		app.deselect(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
		app.select(ids.boxB, ids.boxC)
		expect(app.focusLayerId).toBe(groupCId)
		app.selectNone()
		expect(app.focusLayerId).toBe(groupCId)
	})
})

describe('the select tool', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		groupCId = onlySelectedId()
		app.selectNone()
	})

	it('should select the outermost non-selected group when you click on one of the shapes in that group', () => {
		app.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		expect(onlySelectedId()).toBe(groupCId)
		expect(app.focusLayerId).toBe(app.currentPageId)
		app.pointerDown(0, 0, ids.boxA)
		app.pointerUp(0, 0, ids.boxA)
		expect(onlySelectedId()).toBe(groupAId)
		expect(app.focusLayerId).toBe(groupCId)
		app.pointerDown(0, 0, ids.boxA).pointerUp(0, 0, ids.boxA)
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
	})

	it('should select the outermost non-selected group when you right-click on one of the shapes in that group', () => {
		const boxA = app.getShapeById(ids.boxA)

		app
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(groupCId)
		expect(app.focusLayerId).toBe(app.currentPageId)
		app
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(groupAId)
		expect(app.focusLayerId).toBe(groupCId)
		app
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)
	})

	it('should allow to shift-select other shapes outside of the current focus layer', () => {
		app.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		app.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		app.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)

		app
			.pointerDown(40, 0, ids.boxC, { shiftKey: true })
			.pointerUp(0, 0, ids.boxC, { shiftKey: true })
		expect(app.selectedIds.includes(ids.boxA)).toBe(true)
		expect(app.selectedIds.includes(groupBId)).toBe(true)
		expect(app.focusLayerId).toBe(groupCId)

		app.pointerDown(40, 0, ids.boxC, { shiftKey: true }).pointerUp(0, 0)
		expect(app.selectedIds.includes(ids.boxA)).toBe(true)
		expect(app.selectedIds.includes(groupBId)).toBe(false)
		expect(app.selectedIds.includes(ids.boxC)).toBe(true)
		expect(app.focusLayerId).toBe(groupCId)
	})

	it('if a shape inside a focused group is selected and you click outside the group it should clear the selection and focus the page', () => {
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)

		// click outside the focused group, but inside another group
		app.pointerDown(35, 5, { target: 'canvas' }).pointerUp(35, 5)
		expect(app.focusLayerId).toBe(app.currentPageId)
		expect(app.selectedIds).toHaveLength(0)

		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)

		// click the empty canvas
		app.pointerDown(35, 50, { target: 'canvas' }).pointerUp(35, 50)
		expect(app.focusLayerId).toBe(app.currentPageId)
		expect(app.selectedIds).toHaveLength(0)
	})

	it('if a shape inside a focused group is selected and you click an empty space inside the group it should deselect the shape', () => {
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupAId)

		app.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(app.focusLayerId).toBe(groupAId)
		expect(app.selectedIds.length).toBe(0)
	})

	it('if you click inside the empty space of a focused group while there are no selected shapes, it should pop the focus layer and select the group', () => {
		app.select(ids.boxA)
		app.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(app.focusLayerId).toBe(groupAId)
		expect(app.selectedIds.length).toBe(0)
		app.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(app.focusLayerId).toBe(groupCId)
		expect(onlySelectedId()).toBe(groupAId)
	})

	it('should pop the focus layer when escape is pressed in idle state', () => {
		app.select(ids.boxA)
		expect(app.selectedIds).toMatchObject([ids.boxA]) // box1
		expect(app.focusLayerId).toBe(groupAId)
		// deselct
		app.cancel()
		expect(app.selectedIds).toMatchObject([groupAId]) // groupA
		expect(app.focusLayerId).toBe(groupCId)
		// pop focus layer
		app.cancel()
		expect(app.selectedIds.length).toBe(1) // Group C
		expect(app.focusLayerId).toBe(app.currentPageId)
		app.cancel()
		expect(app.selectedIds.length).toBe(0)
		expect(app.focusLayerId).toBe(app.currentPageId)
	})

	describe('brushing', () => {
		// ! Removed: pointing a group is impossible; you'd be pointing the selection instead.
		// it('should work while focused in a group if you start the drag from within the group', () => {
		// 	app.select(ids.boxA)
		// 	app.pointerDown(15, 5, groupAId).pointerMove(25, 9, ids.boxB)
		// 	expect(app.root.path.value).toBe(`root.select.brushing`)
		// 	expect(app.selectedIds.includes(ids.boxA)).toBe(false)
		// 	expect(app.selectedIds.includes(ids.boxB)).toBe(true)

		// 	app.keyDown('Shift')
		// 	expect(app.selectedIds.includes(ids.boxA)).toBe(true)
		// 	expect(app.selectedIds.includes(ids.boxB)).toBe(true)
		// })

		it('should work while focused in a group if you start the drag from outside of the group', () => {
			app.select(ids.boxA)
			app
				.pointerDown(15, -5, { target: 'canvas' }, { shiftKey: true })
				.pointerMove(25, 9, ids.boxB, { shiftKey: true })

			expect(app.root.path.value).toBe(`root.select.brushing`)
			expect(app.selectedIds.includes(ids.boxA)).toBe(true)
			expect(app.selectedIds.includes(ids.boxB)).toBe(true)

			app.keyUp('Shift')
			jest.advanceTimersByTime(200)

			expect(app.selectedIds.includes(ids.boxA)).toBe(false)
			expect(app.selectedIds.includes(ids.boxB)).toBe(true)
		})

		it('should not select the group until you hit one of its child shapes', () => {
			//             ┌────┐
			//  group C    │    │
			// ┌───────────┼────┼────────────────────────────────────────┐
			// │ group A   │    │                group B                 │
			// │ ┌─────────┼────┼─────────┐     ┌──────────────────────┐ │
			// │ │  ┌───┐  │    │  ┌───┐  │     │ ┌───┐          ┌───┐ │ │
			// │ │  │ A │  │    │  │ B │  │     │ │ C │          │ D │ │ │
			// │ │  └───┘  │    │  └───┘  │     │ └───┘          └───┘ │ │
			// │ └─────────┼────┼─────────┘     └──────────────────────┘ │
			// └───────────┼────┼────────────────────────────────────────┘
			//             │    │
			//             └────┘
			//                  ▲
			//                  │ mouse selection
			app.pointerDown(12.5, -5, undefined).pointerMove(17.5, 15, ids.boxB)
			expect(app.selectedIds.length).toBe(0)
			app.pointerMove(25, 15)
			expect(onlySelectedId()).toBe(groupCId)
		})
	})
})

describe("when a group's children are deleted", () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		groupCId = onlySelectedId()
		app.selectNone()
	})

	it('should ungroup if there is only one shape left', () => {
		app.deleteShapes([ids.boxD])
		expect(app.getShapeById(groupBId)).toBeUndefined()
		expect(app.getShapeById(ids.boxC)?.parentId).toBe(groupCId)
	})

	it('should remove the group if there are no shapes left', () => {
		app.deleteShapes([ids.boxC, ids.boxD])
		expect(app.getShapeById(groupBId)).toBeUndefined()
		expect(app.getShapeById(groupCId)).toBeUndefined()
		expect(app.getShapeById(groupAId)).not.toBeUndefined()
	})
})

describe('creating new shapes', () => {
	let groupA: TLGroupShape
	beforeEach(() => {
		// group A
		// ┌──────────────────────────────┐
		// │      0   10         90   100 │
		// │      ┌───┐                   │
		// │      │ A │                   │
		// │  10  └───┘                   │
		// │                              │
		// │                              │
		// │                              │
		// │                              │
		// │  90                  ┌───┐   │
		// │                      │ B │   │
		// │ 100                  └───┘   │
		// └──────────────────────────────┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 90, 90)])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupA = onlySelectedShape() as TLGroupShape
		app.selectNone()
	})
	describe('boxes', () => {
		it('does not create inside the group if the group is only selected and not focused', () => {
			app.select(groupA.id)
			app.setSelectedTool('geo')
			app.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)
			const boxC = onlySelectedShape()

			expect(boxC.parentId).toBe(app.currentPageId)
			expect(app.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: 20,
				y: 20,
				w: 60,
				h: 60,
			})
		})

		it('does create inside the group if the group is focused', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool('geo')
			app.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)
			const boxC = onlySelectedShape()

			expect(boxC.parentId).toBe(groupA.id)
			expect(app.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: 20,
				y: 20,
				w: 60,
				h: 60,
			})
			expect(app.focusLayerId === groupA.id).toBe(true)
		})

		it('will reisze the group appropriately if the new shape changes the group bounds', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool('geo')
			app.pointerDown(20, 20).pointerMove(-10, -10)

			expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -10,
				y: -10,
				w: 110,
				h: 110,
			})
			app.pointerMove(-20, -20).pointerUp(-20, -20)
			expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 120,
				h: 120,
			})
			const boxC = onlySelectedShape()
			expect(app.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 40,
				h: 40,
			})
		})

		it('works if the shape drawing begins outside of the current group bounds', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool('geo')
			app.pointerDown(-50, -50).pointerMove(-100, -100).pointerUp()

			expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 200,
				h: 200,
			})

			const boxC = onlySelectedShape()
			expect(app.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 50,
				h: 50,
			})
		})
	})

	describe('pencil', () => {
		it('does not draw inside the group if the group is only selected and not focused', () => {
			app.select(groupA.id)

			app.setSelectedTool(TLDrawTool.id)
			app.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

			const lineC = onlySelectedShape()
			expect(lineC.parentId).toBe(app.currentPageId)
		})

		it('does draw inside the group if the group is focused', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool(TLDrawTool.id)
			app.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

			const lineC = onlySelectedShape()
			expect(lineC.parentId).toBe(groupA.id)
		})

		it('will resize the group appropriately if the new shape changes the group bounds', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool(TLDrawTool.id)
			app.pointerDown(20, 20)
			for (let i = 20; i >= -20; i--) {
				app.pointerMove(i, i)
			}
			app.pointerUp()

			const roundToNearestTen = (vals: Box2d) => {
				return {
					x: Math.round(vals.x / 10) * 10,
					y: Math.round(vals.y / 10) * 10,
					w: Math.round(vals.w / 10) * 10,
					h: Math.round(vals.h / 10) * 10,
				}
			}

			expect(roundToNearestTen(app.getPageBoundsById(groupA.id)!)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 120,
				h: 120,
			})
		})

		it('works if the shape drawing begins outside of the current group bounds', () => {
			app.select(ids.boxA)
			expect(app.focusLayerId === groupA.id).toBe(true)

			app.setSelectedTool(TLDrawTool.id)
			app.pointerDown(-20, -20)
			for (let i = -20; i >= -100; i--) {
				app.pointerMove(i, i)
			}
			app.pointerUp()

			const roundToNearestTen = (vals: Box2d) => {
				return {
					x: Math.round(vals.x / 10) * 10,
					y: Math.round(vals.y / 10) * 10,
					w: Math.round(vals.w / 10) * 10,
					h: Math.round(vals.h / 10) * 10,
				}
			}

			expect(roundToNearestTen(app.getPageBoundsById(groupA.id)!)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 200,
				h: 200,
			})
		})

		describe('lines', () => {
			it('does not draw inside the group if the group is only selected and not focused', () => {
				app.select(groupA.id)

				app.setSelectedTool(TLLineTool.id)
				app.pointerDown(20, 20)
				app.pointerMove(80, 80)
				app.pointerUp(80, 80)

				const lineC = onlySelectedShape()
				expect(lineC.type).toBe('line')
				expect(lineC.parentId).toBe(app.currentPageId)
			})

			it('does draw inside the group if the group is focused', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				app.setSelectedTool(TLLineTool.id)
				app.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

				const lineC = onlySelectedShape() as TLLineShape
				expect(lineC.type).toBe('line')
				expect(lineC.parentId).toBe(groupA.id)
			})

			it('will reisze the group appropriately if the new shape changes the group bounds', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				app.setSelectedTool(TLLineTool.id)
				app.pointerDown(20, 20).pointerMove(-10, -10)

				expect(app.getPageBoundsById(groupA.id)).toMatchSnapshot('group with line shape')
				app.pointerMove(-20, -20).pointerUp(-20, -20)
				expect(app.getPageBoundsById(groupA.id)).toMatchSnapshot('group shape after second resize')
				const boxC = onlySelectedShape()
				expect(app.getPageBoundsById(boxC.id)).toMatchSnapshot('box shape after second resize')
			})

			it('works if the shape drawing begins outside of the current group bounds', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				app.setSelectedTool(TLLineTool.id)
				app.pointerDown(-50, -50).pointerMove(-100, -100).pointerUp()

				expect(app.getPageBoundsById(groupA.id)).toMatchSnapshot('group with line')

				const boxC = onlySelectedShape()
				expect(app.getPageBoundsById(boxC.id)).toMatchSnapshot('box shape after resize')
			})
		})

		describe('sticky notes', () => {
			it('does not draw inside the group if the group is only selected and not focused', () => {
				app.select(groupA.id)
				expect(app.focusLayerId === app.currentPageId).toBe(true)

				app.setSelectedTool(TLNoteTool.id)
				app.pointerDown(20, 20).pointerUp()

				const postit = onlySelectedShape()
				expect(postit.parentId).toBe(app.currentPageId)
			})

			it('does draw inside the group if the group is focused', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				app.setSelectedTool(TLNoteTool.id)
				app.pointerDown(20, 20).pointerUp()

				const postit = onlySelectedShape()
				expect(postit.parentId).toBe(groupA.id)
			})

			it('will reisze the group appropriately if the new shape changes the group bounds', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: 0,
					y: 0,
					w: 100,
					h: 100,
				})

				app.setSelectedTool(TLNoteTool.id)
				app.pointerDown(80, 80)
				app.pointerUp()
				// default size is 200x200, and it centers it, so add 100px around the pointer
				expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -20,
					y: -20,
					w: 200,
					h: 200,
				})

				app.pointerMove(20, 20)
				app.pointerUp(20, 20)
				expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -20,
					y: -20,
					w: 200,
					h: 200,
				})
			})

			it('works if the shape drawing begins outside of the current group bounds', () => {
				app.select(ids.boxA)
				expect(app.focusLayerId === groupA.id).toBe(true)

				app.setSelectedTool(TLNoteTool.id)
				expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: 0,
					y: 0,
					w: 100,
					h: 100,
				})
				app.pointerDown(-20, -20).pointerUp(-20, -20)
				expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -120,
					y: -120,
					w: 220,
					h: 220,
				})
			})
		})
	})
})

describe('erasing', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		groupCId = onlySelectedId()
		app.selectNone()
	})

	it('erases whole groups if you hit one of their shapes', () => {
		app.setSelectedTool(TLEraserTool.id)

		// erase D
		app.pointerDown(65, 5, ids.boxD)
		expect(app.pageState.erasingIds.length).toBe(1)
		expect(app.pageState.erasingIds[0]).toBe(groupCId)
		app.pointerUp()
		expect(app.getShapeById(groupCId)).toBeFalsy()
	})

	it('does not erase whole groups if you do not hit on one of their shapes', () => {
		app.setSelectedTool(TLEraserTool.id)

		app.pointerDown(35, 5)
		expect(app.erasingIdsSet.size).toBe(0)
	})

	it('works inside of groups', () => {
		app.select(ids.boxA)
		expect(app.focusLayerId === groupAId).toBe(true)
		const groupA = app.getShapeById(groupAId)!

		app.setSelectedTool(TLEraserTool.id)

		// erase B
		app.pointerDown(25, 5, ids.boxB)
		expect(app.pageState.erasingIds.length).toBe(1)
		expect(app.pageState.erasingIds[0]).toBe(ids.boxB)
		app.pointerUp()

		// group A disappears
		expect(isRemoved(groupA)).toBe(true)
	})

	it('works outside of the focus layer', () => {
		app.select(ids.boxA)
		expect(app.focusLayerId === groupAId).toBe(true)

		app.setSelectedTool(TLEraserTool.id)

		// erase E
		app.pointerDown(5, 25, ids.boxE)
		expect(app.pageState.erasingIds.length).toBe(1)
		expect(app.pageState.erasingIds[0]).toBe(ids.boxE)

		// move to group B
		app.pointerMove(65, 5)

		expect(app.erasingIdsSet.size).toBe(2)
	})
})

describe('bindings', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		app.selectNone()
	})

	it('can not be made from some sibling shape to a group shape', () => {
		app.setSelectedTool(TLArrowTool.id)
		// go from E to group C (not hovering over a leaf box)
		app.pointerDown(5, 25).pointerMove(35, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxE })
		expect(arrow.props.end).toMatchObject({ type: 'point' })
	})

	it('can not be made from a group shape to some sibling shape', () => {
		app.setSelectedTool(TLArrowTool.id)
		// go from group C (not hovering over a leaf box) to E
		app.pointerDown(35, 5).pointerMove(5, 25).pointerUp()

		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.props.start).toMatchObject({ type: 'point' })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxE })
	})
	it('can be made from a shape within a group to some shape outside of the group', () => {
		app.setSelectedTool(TLArrowTool.id)
		// go from A to E
		app.pointerDown(5, 5).pointerMove(5, 25).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(app.currentPageId)

		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxA })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxE })
	})

	it('can be made from a shape within a group to another shape within the group', () => {
		app.setSelectedTool(TLArrowTool.id)
		// go from A to B
		app.pointerDown(5, 5).pointerMove(25, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(groupAId)
		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxA })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxB })
	})

	it('can be made from a shape outside of a group to a shape within the group', () => {
		app.setSelectedTool(TLArrowTool.id)
		// go from E to B
		app.pointerDown(5, 25).pointerMove(25, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(app.currentPageId)
		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxE })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxB })
	})
})

describe('grouping arrows', () => {
	// Fix for <https://linear.app/tldraw/issue/TLD-887/cant-duplicate-arrows-in-group>
	it('grouping 2 arrows should not change indexes', () => {
		const arrowAId = createCustomShapeId('arrowA')
		const arrowBId = createCustomShapeId('arrowB')

		app.createShapes([
			arrow(arrowAId, { x: 0, y: 0 }, { x: 0, y: 10 }),
			arrow(arrowBId, { x: 10, y: 0 }, { x: 10, y: 10 }),
		])

		const arrowABefore = app.getShapeById(arrowAId)!
		const arrowBBefore = app.getShapeById(arrowBId)!

		expect(arrowABefore.parentId).toMatch(/^page:/)
		expect(arrowABefore.index).toBe('a1')
		expect(arrowBBefore.parentId).toMatch(/^page:/)
		expect(arrowBBefore.index).toBe('a2')

		app.select(arrowAId, arrowBId)
		app.groupShapes()

		const arrowAAfter = app.getShapeById(arrowAId)!
		const arrowBAfter = app.getShapeById(arrowBId)!

		expect(arrowAAfter.parentId).toMatch(/^shape:/)
		expect(arrowAAfter.index).toBe('a1')

		expect(arrowBAfter.parentId).toMatch(/^shape:/)
		expect(arrowBAfter.index).toBe('a2')
	})
})

describe('moving handles within a group', () => {
	let groupA: TLGroupShape
	beforeEach(() => {
		// group A
		// ┌──────────────────────────────┐
		// │      0   10         90   100 │
		// │      ┌───┐                   │
		// │      │ A │                   │
		// │  10  └───┘                   │
		// │                              │
		// │                              │
		// │                              │
		// │                              │
		// │  90                  ┌───┐   │
		// │                      │ B │   │
		// │ 100                  └───┘   │
		// └──────────────────────────────┘
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 90, 90)])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupA = onlySelectedShape() as TLGroupShape
		app.selectNone()
	})
	it('resizes the group appropriately', () => {
		app.select(ids.boxA)
		expect(app.focusLayerId).toBe(groupA.id)

		app.setSelectedTool('arrow')

		app.pointerDown(50, 50).pointerMove(60, 60).pointerUp(60, 60)

		let arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(groupA.id)

		expect(arrow.props.start.type).toBe('point')
		if (arrow.props.start.type === 'point') {
			expect(arrow.props.start.x).toBe(0)
			expect(arrow.props.start.y).toBe(0)
		}

		expect(arrow.props.end.type).toBe('point')
		if (arrow.props.end.type === 'point') {
			expect(arrow.props.end.x).toBe(10)
			expect(arrow.props.end.y).toBe(10)
		}

		app.expectToBeIn('select.idle')

		expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 100,
			h: 100,
		})

		app.pointerDown(60, 60, {
			target: 'handle',
			shape: arrow,
			handle: app
				.getShapeUtilByDef(TLArrowShapeDef)
				.handles(arrow)
				.find((h) => h.id === 'end'),
		})

		app.expectToBeIn('select.pointing_handle')
		app.pointerMove(60, -10)
		app.expectToBeIn('select.dragging_handle')
		app.pointerMove(60, -10)

		arrow = app.getShapeById(arrow.id)!

		expect(arrow.parentId).toBe(groupA.id)

		expect(arrow.props.start.type).toBe('point')
		if (arrow.props.start.type === 'point') {
			expect(arrow.props.start.x).toBe(0)
			expect(arrow.props.start.y).toBe(0)
		}

		expect(arrow.props.end.type).toBe('point')
		if (arrow.props.end.type === 'point') {
			expect(arrow.props.end.x).toBe(10)
			expect(arrow.props.end.y).toBe(-60)
		}

		expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 100,
			h: 110,
		})

		app.pointerMove(50, -10)
		for (let i = -10; i >= -30; i--) {
			app.pointerMove(i, i)
		}

		app.pointerUp()

		expect(app.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: -30,
			y: -30,
			w: 130,
			h: 130,
		})
	})
})

// ! Parked temporarily. This behavior has changed and may need to change back.

// describe('copy/pasting to/from groups', () => {
// 	let groupAId: TLShapeId
// 	let groupBId: TLShapeId
// 	let groupCId: TLShapeId
// 	beforeEach(() => {
// 		//  group C
// 		// ┌─────────────────────────────────────────────────────────┐
// 		// │ group A                         group B                 │
// 		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
// 		// │ │  0             20      │     │ 40            60     │ │
// 		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
// 		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
// 		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
// 		// │ └────────────────────────┘     └──────────────────────┘ │
// 		// └─────────────────────────────────────────────────────────┘
// 		//
// 		//  20  ┌───┐
// 		//      │ E │
// 		//      └───┘
// 		app.createShapes([
// 			box(ids.boxA, 0, 0),
// 			box(ids.boxB, 20, 0),
// 			box(ids.boxC, 40, 0),
// 			box(ids.boxD, 60, 0),
// 			box(ids.boxE, 0, 20),
// 		])
// 		app.select(ids.boxA, ids.boxB)
// 		app.groupShapes()
// 		groupAId = onlySelectedId()
// 		app.select(ids.boxC, ids.boxD)
// 		app.groupShapes()
// 		groupBId = onlySelectedId()
// 		app.select(groupAId, groupBId)
// 		app.groupShapes()
// 		groupCId = onlySelectedId()
// 		app.selectNone()
// 	})

// 	it('should allow copying and pasting within the same focus layer', () => {
// 		app.select(groupAId)
// 		expect(app.focusLayerId).toBe(groupCId)
// 		app.copy()
// 		app.paste()
// 		expect(app.focusLayerId).toBe(groupCId)
// 		expect(onlySelectedId()).not.toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(
// 			app.getSortedChildIds(onlySelectedShape().id).map((id) => app.getShapeById(id)!.type)
// 		).toEqual(['geo', 'geo'])
// 	})

// 	it('should allow copying from within a group and pasting into a higher focus level', () => {
// 		app.select(groupAId)
// 		expect(app.focusLayerId).toBe(groupCId)
// 		app.copy()
// 		app.select(groupCId)
// 		expect(app.focusLayerId).toBe(app.currentPageId)
// 		app.paste()
// 		expect(app.focusLayerId).toBe(app.currentPageId)
// 		expect(onlySelectedId()).not.toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(
// 			app.getSortedChildIds(onlySelectedShape().id).map((id) => app.getShapeById(id)!.type)
// 		).toEqual(['geo', 'geo'])
// 		expect(app.getPageBoundsById(groupAId)).toCloselyMatchObject(
// 			app.getPageBoundsById(onlySelectedId())
// 		)
// 	})
// 	it('should allow copying from a higher focus level and pasting into a group', () => {
// 		app.select(groupCId)
// 		expect(app.focusLayerId).toBe(app.currentPageId)
// 		app.copy()
// 		app.select(ids.boxA)
// 		expect(app.focusLayerId).toBe(groupAId)
// 		app.paste()
// 		expect(app.focusLayerId).toBe(groupAId)
// 		expect(onlySelectedId()).not.toBe(groupCId)
// 		expect(onlySelectedShape().parentId).toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(app.getSortedChildIds(onlySelectedId()).map((id) => app.getShapeById(id)!.type)).toEqual(
// 			[TLGroupUtil.type, TLGroupUtil.type]
// 		)
// 	})
// })

describe('snapping', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		app.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		groupAId = onlySelectedId()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		groupBId = onlySelectedId()
		app.select(groupAId, groupBId)
		app.groupShapes()
		groupCId = onlySelectedId()
		app.selectNone()
	})

	it('does not happen between groups and their children', () => {
		app.select(groupCId)
		app.pointerDown(10, 5, groupCId)
		app.pointerMove(80, 5, groupCId, { ctrlKey: true })
		expect(app.snaps.lines.length).toBe(0)
	})

	it('does not happen between children and thier group', () => {
		app.select(ids.boxD)
		app.pointerDown(65, 5, ids.boxD)
		app.pointerMove(80, 105, ids.boxD, { ctrlKey: true })
		expect(app.snaps.lines.length).toBe(0)
	})
})

describe('When pressing enter with selected group', () => {
	it('Should select the children of the group when enter is pressed', () => {
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		app.select(ids.boxA, ids.boxB, ids.boxC)
		app.groupShapes()
		app.keyDown('Enter')
		app.keyUp('Enter')
		expect(app.selectedIds).toMatchObject([ids.boxA, ids.boxB, ids.boxC])
	})
	it('Should select the children of multiple groups when enter is pressed', () => {
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0)])
		app.createShapes([box(ids.boxC, 40, 0), box(ids.boxD, 70, 0)])
		app.select(ids.boxA, ids.boxB)
		app.groupShapes()
		app.select(ids.boxC, ids.boxD)
		app.groupShapes()
		app.selectAll() // both groups
		app.keyDown('Enter')
		app.keyUp('Enter')
		expect(app.selectedIds).toMatchObject([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
	})
})

describe('Group opacity', () => {
	it("should set the group's opacity to max even if the selected style panel opacity is lower", () => {
		app.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0)])
		app.select(ids.boxA, ids.boxB)
		app.setProp('opacity', '0.5')
		app.groupShapes()
		const group = app.getShapeById(onlySelectedId())!
		assert(TLGroupShapeDef.is(group))
		expect(group.props.opacity).toBe('1')
	})
})
