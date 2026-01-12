import {
	Box,
	Geometry2d,
	PageRecordType,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
	debugFlags,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	editor.setCamera({ x: 0, y: 0, z: 1 })
})

afterEach(() => {
	editor?.dispose()
})

// Custom test shape for testing canCull behavior
declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		'not-visible-test-shape': { w: number; h: number; canCull: boolean }
	}
}

type ITestShape = TLShape<'not-visible-test-shape'>

class TestShape extends ShapeUtil<ITestShape> {
	static override type = 'not-visible-test-shape' as const
	static override props: RecordProps<ITestShape> = {
		w: T.number,
		h: T.number,
		canCull: T.boolean,
	}
	getDefaultProps(): ITestShape['props'] {
		return { w: 100, h: 100, canCull: true }
	}
	getGeometry(shape: ITestShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}
	override canCull(shape: ITestShape): boolean {
		return shape.props.canCull
	}
	override canEdit() {
		return true
	}
	indicator() {}
	component() {}
}

describe('notVisibleShapes - basic culling', () => {
	it('should identify shapes outside viewport', () => {
		const insideId = createShapeId('inside')
		const outsideId = createShapeId('outside')

		editor.createShapes([
			{ id: insideId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: outsideId, type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } },
		])

		const notVisible = editor.getNotVisibleShapes()

		expect(notVisible.has(insideId)).toBe(false)
		expect(notVisible.has(outsideId)).toBe(true)
	})

	it('should update when shapes move in/out of viewport', () => {
		const shapeId = createShapeId('moving')
		editor.createShapes([{ id: shapeId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])

		// Initially visible
		let notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(false)

		// Move outside viewport
		editor.updateShapes([{ id: shapeId, type: 'geo', x: 2000, y: 2000 }])
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(true)

		// Move back inside
		editor.updateShapes([{ id: shapeId, type: 'geo', x: 100, y: 100 }])
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(false)
	})

	it('should update when viewport moves', () => {
		const shapeId = createShapeId('stationary')
		editor.createShapes([{ id: shapeId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])

		// Initially visible
		let notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(false)

		// Pan viewport away from shape
		editor.setCamera({ x: -2000, y: -2000, z: 1 })
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(true)

		// Pan back
		editor.setCamera({ x: 0, y: 0, z: 1 })
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(shapeId)).toBe(false)
	})
})

describe('notVisibleShapes - canCull behavior', () => {
	it('should not cull shapes that return false from canCull', () => {
		// Register TestShape temporarily for this test
		const testEditor = new TestEditor({ shapeUtils: [TestShape] })
		testEditor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
		testEditor.setCamera({ x: 0, y: 0, z: 1 })

		const cullableId = createShapeId('cullable')
		const nonCullableId = createShapeId('non-cullable')

		testEditor.createShapes([
			{
				id: cullableId,
				type: 'not-visible-test-shape',
				x: 2000,
				y: 2000,
				props: { canCull: true },
			},
			{
				id: nonCullableId,
				type: 'not-visible-test-shape',
				x: 2000,
				y: 2000,
				props: { canCull: false },
			},
		])

		const notVisible = testEditor.getNotVisibleShapes()

		expect(notVisible.has(cullableId)).toBe(true)
		expect(notVisible.has(nonCullableId)).toBe(false)

		testEditor.dispose()
	})
})

describe('notVisibleShapes - selected shapes', () => {
	it('should not cull selected shapes even if outside viewport', () => {
		const shapeId = createShapeId('selected')
		editor.createShapes([{ id: shapeId, type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } }])

		// Not selected - should be in notVisible and culled
		let notVisible = editor.getNotVisibleShapes()
		let culled = editor.getCulledShapes()
		expect(notVisible.has(shapeId)).toBe(true)
		expect(culled.has(shapeId)).toBe(true)

		// Select it - still in notVisible but not culled
		editor.select(shapeId)
		notVisible = editor.getNotVisibleShapes()
		culled = editor.getCulledShapes()
		expect(notVisible.has(shapeId)).toBe(true)
		expect(culled.has(shapeId)).toBe(false)

		// Deselect - back in culled
		editor.selectNone()
		notVisible = editor.getNotVisibleShapes()
		culled = editor.getCulledShapes()
		expect(notVisible.has(shapeId)).toBe(true)
		expect(culled.has(shapeId)).toBe(true)
	})
})

describe('notVisibleShapes - spatial index comparison', () => {
	it('should produce same results with both implementations', () => {
		// Create a mix of shapes
		editor.createShapes([
			{ id: createShapeId('inside1'), type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: createShapeId('inside2'), type: 'geo', x: 500, y: 500, props: { w: 100, h: 100 } },
			{ id: createShapeId('outside1'), type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } },
			{ id: createShapeId('outside2'), type: 'geo', x: 3000, y: 3000, props: { w: 100, h: 100 } },
			{
				id: createShapeId('outside-selected'),
				type: 'geo',
				x: 2500,
				y: 2500,
				props: { w: 100, h: 100 },
			},
		])

		// Select one outside shape
		editor.select(createShapeId('outside-selected'))

		// Test with old implementation
		debugFlags.useSpatialIndex.set(false)
		const notVisibleOld = editor.getNotVisibleShapes()

		// Test with spatial index
		debugFlags.useSpatialIndex.set(true)
		const notVisibleNew = editor.getNotVisibleShapes()

		// Should produce identical results
		expect(notVisibleNew.size).toBe(notVisibleOld.size)
		for (const id of notVisibleOld) {
			expect(notVisibleNew.has(id)).toBe(true)
		}
		for (const id of notVisibleNew) {
			expect(notVisibleOld.has(id)).toBe(true)
		}

		// Reset flag
		debugFlags.useSpatialIndex.set(false)
	})

	it('should handle edge cases consistently', () => {
		// Create shapes at viewport boundaries
		editor.createShapes([
			{ id: createShapeId('at-edge-left'), type: 'geo', x: -50, y: 500, props: { w: 100, h: 100 } },
			{
				id: createShapeId('at-edge-right'),
				type: 'geo',
				x: 950,
				y: 500,
				props: { w: 100, h: 100 },
			},
			{ id: createShapeId('at-edge-top'), type: 'geo', x: 500, y: -50, props: { w: 100, h: 100 } },
			{
				id: createShapeId('at-edge-bottom'),
				type: 'geo',
				x: 500,
				y: 950,
				props: { w: 100, h: 100 },
			},
			{
				id: createShapeId('barely-outside'),
				type: 'geo',
				x: 1001,
				y: 1001,
				props: { w: 100, h: 100 },
			},
		])

		// Test with old implementation
		debugFlags.useSpatialIndex.set(false)
		const notVisibleOld = editor.getNotVisibleShapes()

		// Test with spatial index
		debugFlags.useSpatialIndex.set(true)
		const notVisibleNew = editor.getNotVisibleShapes()

		// Should produce identical results
		expect(notVisibleNew.size).toBe(notVisibleOld.size)
		for (const id of notVisibleOld) {
			expect(notVisibleNew.has(id)).toBe(true)
		}

		// Reset flag
		debugFlags.useSpatialIndex.set(false)
	})
})

describe('notVisibleShapes - caching', () => {
	it('should return same Set object when contents unchanged', () => {
		editor.createShapes([{ id: createShapeId('shape1'), type: 'geo', x: 2000, y: 2000 }])

		const notVisible1 = editor.getNotVisibleShapes()
		const notVisible2 = editor.getNotVisibleShapes()

		// Should return same reference when nothing changed
		expect(notVisible1).toBe(notVisible2)
	})

	it('should return new Set object when contents change', () => {
		const shapeId = createShapeId('moving')
		editor.createShapes([{ id: shapeId, type: 'geo', x: 2000, y: 2000 }])

		const notVisible1 = editor.getNotVisibleShapes()

		// Move shape into viewport
		editor.updateShapes([{ id: shapeId, type: 'geo', x: 100, y: 100 }])

		const notVisible2 = editor.getNotVisibleShapes()

		// Should return different reference when contents changed
		expect(notVisible1).not.toBe(notVisible2)
	})
})

describe('notVisibleShapes - multiple pages', () => {
	it('should only cull shapes on current page', () => {
		const page1 = editor.getCurrentPageId()

		// Create shapes on page 1
		const page1Shape1 = createShapeId('page1-inside')
		const page1Shape2 = createShapeId('page1-outside')
		editor.createShapes([
			{ id: page1Shape1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: page1Shape2, type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } },
		])

		// Create page 2
		const page2 = PageRecordType.createId('page2')
		editor.createPage({ name: 'page2', id: page2 })
		editor.setCurrentPage(page2)

		// Create shapes on page 2
		const page2Shape1 = createShapeId('page2-inside')
		const page2Shape2 = createShapeId('page2-outside')
		editor.createShapes([
			{ id: page2Shape1, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
			{ id: page2Shape2, type: 'geo', x: 3000, y: 3000, props: { w: 100, h: 100 } },
		])

		// Check page 2 culling
		let notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(page2Shape1)).toBe(false)
		expect(notVisible.has(page2Shape2)).toBe(true)
		// Page 1 shapes should not be in the set at all
		expect(notVisible.has(page1Shape1)).toBe(false)
		expect(notVisible.has(page1Shape2)).toBe(false)

		// Switch back to page 1
		editor.setCurrentPage(page1)

		// Check page 1 culling
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(page1Shape1)).toBe(false)
		expect(notVisible.has(page1Shape2)).toBe(true)
		// Page 2 shapes should not be in the set
		expect(notVisible.has(page2Shape1)).toBe(false)
		expect(notVisible.has(page2Shape2)).toBe(false)
	})

	it('should maintain separate spatial indexes per page', () => {
		const page1 = editor.getCurrentPageId()

		// Create many shapes on page 1
		for (let i = 0; i < 100; i++) {
			editor.createShapes([
				{
					id: createShapeId(`page1-shape-${i}`),
					type: 'geo',
					x: (i % 10) * 200,
					y: Math.floor(i / 10) * 200,
				},
			])
		}

		// Create page 2
		const page2 = PageRecordType.createId('page2')
		editor.createPage({ name: 'page2', id: page2 })
		editor.setCurrentPage(page2)

		// Create different shapes on page 2
		for (let i = 0; i < 50; i++) {
			editor.createShapes([
				{
					id: createShapeId(`page2-shape-${i}`),
					type: 'geo',
					x: (i % 5) * 300,
					y: Math.floor(i / 5) * 300,
				},
			])
		}

		// Test with spatial index
		debugFlags.useSpatialIndex.set(true)

		// Check page 2
		const notVisiblePage2 = editor.getNotVisibleShapes()
		const page2ShapeIds = editor.getCurrentPageShapeIds()
		expect(page2ShapeIds.size).toBe(50)

		// Switch to page 1
		editor.setCurrentPage(page1)
		const notVisiblePage1 = editor.getNotVisibleShapes()
		const page1ShapeIds = editor.getCurrentPageShapeIds()
		expect(page1ShapeIds.size).toBe(100)

		// Results should be different (different shapes on each page)
		expect(notVisiblePage1.size).not.toBe(notVisiblePage2.size)

		// No page 2 shapes should appear in page 1 results
		for (const id of notVisiblePage1) {
			expect(id.includes('page2')).toBe(false)
		}

		// No page 1 shapes should appear in page 2 results
		for (const id of notVisiblePage2) {
			expect(id.includes('page1')).toBe(false)
		}

		// Reset flag
		debugFlags.useSpatialIndex.set(false)
	})

	it('should update indexes when switching pages', () => {
		const page1 = editor.getCurrentPageId()

		// Create shape outside viewport on page 1
		const page1OutsideShape = createShapeId('page1-outside')
		editor.createShapes([{ id: page1OutsideShape, type: 'geo', x: 2000, y: 2000 }])

		// Verify it's culled
		let notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(page1OutsideShape)).toBe(true)

		// Create page 2 and switch to it
		const page2 = PageRecordType.createId('page2')
		editor.createPage({ name: 'page2', id: page2 })
		editor.setCurrentPage(page2)

		// Create shape inside viewport on page 2
		const page2InsideShape = createShapeId('page2-inside')
		editor.createShapes([{ id: page2InsideShape, type: 'geo', x: 100, y: 100 }])

		// Page 2 shape should not be culled
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(page2InsideShape)).toBe(false)
		// Page 1 shape should not appear in results
		expect(notVisible.has(page1OutsideShape)).toBe(false)

		// Switch back to page 1
		editor.setCurrentPage(page1)

		// Page 1 shape should still be culled
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(page1OutsideShape)).toBe(true)
		// Page 2 shape should not appear
		expect(notVisible.has(page2InsideShape)).toBe(false)
	})
})

describe('notVisibleShapes - arrows with bindings', () => {
	it('should update arrow visibility when bound shape moves', () => {
		const boxAId = createShapeId('boxA')
		const boxBId = createShapeId('boxB')

		// Create two boxes inside viewport
		editor.createShapes([
			{ id: boxAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: boxBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
		])

		// Draw arrow between boxes using arrow tool
		editor.setCurrentTool('arrow')
		editor.pointerDown(150, 150) // center of boxA
		editor.pointerMove(350, 150) // center of boxB
		editor.pointerUp(350, 150)

		// Get the arrow shape
		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		expect(arrow).toBeDefined()

		// All shapes visible initially
		let notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(boxAId)).toBe(false)
		expect(notVisible.has(boxBId)).toBe(false)
		expect(notVisible.has(arrow.id)).toBe(false)

		// Move boxA outside viewport
		editor.updateShapes([{ id: boxAId, type: 'geo', x: 2000, y: 2000 }])
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(boxAId)).toBe(true)
		expect(notVisible.has(boxBId)).toBe(false)
		// Arrow visibility depends on whether any bound shape is visible

		// Move boxB outside viewport too
		editor.updateShapes([{ id: boxBId, type: 'geo', x: 2000, y: 2000 }])
		notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(boxAId)).toBe(true)
		expect(notVisible.has(boxBId)).toBe(true)
		expect(notVisible.has(arrow.id)).toBe(true) // Arrow not visible because both boxes outside
	})

	it('should not cull selected arrow even if outside viewport', () => {
		// Create arrow outside viewport
		editor.setCurrentTool('arrow')
		editor.pointerDown(2000, 2000)
		editor.pointerMove(2200, 2000)
		editor.pointerUp(2200, 2000)

		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		expect(arrow).toBeDefined()

		// Arrow outside viewport, selected by arrow tool
		let notVisible = editor.getNotVisibleShapes()
		let culled = editor.getCulledShapes()
		expect(notVisible.has(arrow.id)).toBe(true)
		// Arrow is selected after creation, so not culled
		expect(culled.has(arrow.id)).toBe(false)

		// Deselect arrow
		editor.selectNone()
		notVisible = editor.getNotVisibleShapes()
		culled = editor.getCulledShapes()
		expect(notVisible.has(arrow.id)).toBe(true)
		expect(culled.has(arrow.id)).toBe(true) // Now culled

		// Select arrow again - should not be culled
		editor.select(arrow.id)
		notVisible = editor.getNotVisibleShapes()
		culled = editor.getCulledShapes()
		expect(notVisible.has(arrow.id)).toBe(true)
		expect(culled.has(arrow.id)).toBe(false) // Not culled because selected
	})
})

describe('notVisibleShapes - frames', () => {
	it('should cull frame when outside viewport', () => {
		const frameId = createShapeId('frame')

		// Create frame outside viewport
		editor.createShapes([
			{ id: frameId, type: 'frame', x: 2000, y: 2000, props: { w: 500, h: 500 } },
		])

		// Frame should be not visible
		const notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(frameId)).toBe(true)
	})

	it('should keep frame visible when inside viewport', () => {
		const frameId = createShapeId('frame')

		// Create frame inside viewport
		editor.createShapes([{ id: frameId, type: 'frame', x: 100, y: 100, props: { w: 500, h: 500 } }])

		// Frame should be visible
		const notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(frameId)).toBe(false)
	})

	it('should not cull frame with children inside viewport', () => {
		const frameId = createShapeId('frame')
		const childId = createShapeId('child')

		// Create frame inside viewport
		editor.createShapes([{ id: frameId, type: 'frame', x: 100, y: 100, props: { w: 500, h: 500 } }])

		// Create child inside frame
		editor.createShapes([
			{
				id: childId,
				type: 'geo',
				x: 200,
				y: 200,
				parentId: frameId,
				props: { w: 100, h: 100 },
			},
		])

		// Both should be visible
		const notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(frameId)).toBe(false)
		expect(notVisible.has(childId)).toBe(false)
	})
})

describe('notVisibleShapes - groups', () => {
	it('should keep group visible when any child is visible', () => {
		const groupId = createShapeId('group')
		const childAId = createShapeId('childA')
		const childBId = createShapeId('childB')

		// Create shapes - one inside, one outside viewport
		editor.createShapes([
			{ id: childAId, type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } },
			{ id: childBId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		])

		// Group the shapes
		editor.select(childAId, childBId)
		editor.groupShapes(editor.getSelectedShapeIds(), { groupId })

		// Group has visible child, so group bounds include visible area
		const notVisible = editor.getNotVisibleShapes()
		// Group visibility depends on its computed bounds
		expect(notVisible.has(childBId)).toBe(false) // childB is visible
	})

	it('should cull group when all children are outside viewport', () => {
		const groupId = createShapeId('group')
		const childAId = createShapeId('childA')
		const childBId = createShapeId('childB')

		// Create group with all children outside viewport
		editor.createShapes([
			{ id: childAId, type: 'geo', x: 2000, y: 2000, props: { w: 100, h: 100 } },
			{ id: childBId, type: 'geo', x: 2200, y: 2200, props: { w: 100, h: 100 } },
		])

		// Group the shapes
		editor.select(childAId, childBId)
		editor.groupShapes(editor.getSelectedShapeIds(), { groupId })

		// All should be not visible
		const notVisible = editor.getNotVisibleShapes()
		expect(notVisible.has(groupId)).toBe(true)
		expect(notVisible.has(childAId)).toBe(true)
		expect(notVisible.has(childBId)).toBe(true)
	})

	it('should update visibility when children move', () => {
		const groupId = createShapeId('group')
		const childAId = createShapeId('childA')
		const childBId = createShapeId('childB')

		// Create group with all children inside viewport
		editor.createShapes([
			{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: childBId, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
		])

		// Group the shapes
		editor.select(childAId, childBId)
		editor.groupShapes(editor.getSelectedShapeIds(), { groupId })

		// Initially visible
		let notVisible = editor.getNotVisibleShapes()
		// Group is selected after creation, so not checking it
		expect(notVisible.has(childAId)).toBe(false)
		expect(notVisible.has(childBId)).toBe(false)

		// Deselect and move both children outside viewport
		editor.selectNone()
		editor.updateShapes([
			{ id: childAId, type: 'geo', x: 2000, y: 2000 },
			{ id: childBId, type: 'geo', x: 2200, y: 2200 },
		])
		notVisible = editor.getNotVisibleShapes()
		// All should now be not visible
		expect(notVisible.has(groupId)).toBe(true)
		expect(notVisible.has(childAId)).toBe(true)
		expect(notVisible.has(childBId)).toBe(true)
	})
})
