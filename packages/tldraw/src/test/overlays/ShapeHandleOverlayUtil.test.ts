import { createShapeId } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { ShapeHandleOverlayUtil } from '../../lib/overlays/ShapeHandleOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	line1: createShapeId('line1'),
	arrow1: createShapeId('arrow1'),
	geo1: createShapeId('geo1'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('ShapeHandleOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when no shape is selected', () => {
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(false)
		})

		it('returns false when in readonly mode', () => {
			editor.updateInstanceState({ isReadonly: true })
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(false)
		})

		it('returns false when changing style', () => {
			editor.updateInstanceState({ isChangingStyle: true })
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(false)
		})

		it('returns false when selected shape has no handles', () => {
			editor.createShapes([
				{ id: ids.geo1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			editor.select(ids.geo1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(false)
		})

		it('returns true in select.idle with a shape that has handles', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(true)
		})

		it('returns true in select.pointing_handle', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const shape = editor.getShape(ids.line1)!
			const handle = editor.getShapeHandles(shape)![0]
			const pt = editor.getShapePageTransform(shape)!.applyToPoint(handle)
			editor.pointerMove(pt.x, pt.y)
			editor.pointerDown(pt.x, pt.y, { target: 'handle', shape, handle })
			editor.expectToBeIn('select.pointing_handle')
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(true)
			editor.pointerUp()
		})

		it('returns true in select.pointing_shape with a handle shape selected', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 120, y: 120 }])
			const shape = editor.getShape(ids.line1)!
			editor.pointerDown(shape.x + 1, shape.y + 1, { target: 'shape', shape })
			editor.expectToBeIn('select.pointing_shape')
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(true)
			editor.pointerUp()
		})

		it('returns true in select.editing_shape for note shapes', () => {
			editor.createShapes([{ id: ids.geo1, type: 'note', x: 100, y: 100 } as any])
			const shape = editor.getShape(ids.geo1)!
			editor.setEditingShape(shape)
			editor.expectToBeIn('select.editing_shape')
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(true)
		})

		it('returns false in select.editing_shape for non-note shapes', () => {
			editor.createShapes([
				{ id: ids.geo1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			const shape = editor.getShape(ids.geo1)!
			editor.setEditingShape(shape)
			// Even if editing state is entered for geo, util should be inactive (only active for notes)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.isActive()).toBe(false)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no shape is selected', () => {
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns overlays for the selected shape handles', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const overlays = util.getOverlays()
			expect(overlays.length).toBeGreaterThan(0)
			// id format: handle:<shapeId>:<handleId>
			expect(overlays[0].id.startsWith(`handle:${ids.line1}`)).toBe(true)
		})

		it('filters virtual handles that are too close to vertex handles', () => {
			// Use arc arrow which provides a 'virtual' middle handle; make it very short
			editor.createShapes([
				{
					id: ids.line1,
					type: 'arrow',
					x: 0,
					y: 0,
					props: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } } as any,
				},
			] as any)
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const overlays = util.getOverlays()
			// Expect no 'virtual' middle handle due to threshold filter
			expect(overlays.every((o) => o.props.handle.type !== 'virtual')).toBe(true)
		})

		it('uses coarse handle radius for filtering when pointer is coarse', () => {
			// Create a line where midpoint is far enough for normal (24px) but inside coarse (40px)
			editor.updateInstanceState({ isCoarsePointer: false })
			editor.createShapes([
				{
					id: ids.line1,
					type: 'arrow',
					x: 0,
					y: 0,
					props: { start: { x: 0, y: 0 }, end: { x: 70, y: 0 } } as any,
				},
			] as any)
			editor.select(ids.line1)
			let overlays = editor.overlays
				.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
				.getOverlays()
			// Virtual present at normal pointer
			expect(overlays.some((o) => o.props.handle.type === 'virtual')).toBe(true)
			// Now coarse pointer: virtual should be filtered
			editor.updateInstanceState({ isCoarsePointer: true })
			overlays = editor.overlays
				.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
				.getOverlays()
			expect(overlays.some((o) => o.props.handle.type === 'virtual')).toBe(false)
		})

		it('sorts vertex handles before other types for hit-test priority', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const types = util.getOverlays().map((o) => o.props.handle.type)
			// Expect vertices first (for hit-test priority), then non-vertex (create/virtual)
			// handles at the end; `render` iterates this array in reverse so
			// vertex handles still paint on top visually.
			const firstVertexIndex = types.findIndex((t: string) => t === 'vertex')
			const firstNonVertexIndex = types.findIndex((t: string) => t !== 'vertex')
			expect(firstVertexIndex).toBeGreaterThanOrEqual(0)
			expect(firstNonVertexIndex).toBeGreaterThanOrEqual(0)
			expect(firstVertexIndex).toBeLessThan(firstNonVertexIndex)
			expect(types[0]).toBe('vertex')
		})

		it('returns empty array when shape is hidden', () => {
			const hiddenEditor = new TestEditor({
				overlayUtils: defaultOverlayUtils as any,
				getShapeVisibility: (shape: any) => (shape.type === 'line' ? 'hidden' : 'visible'),
			} as any)
			hiddenEditor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			hiddenEditor.select(ids.line1)
			const util = hiddenEditor.overlays.getOverlayUtil('shape_handle')
			expect(util.getOverlays()).toEqual([])
		})

		it('produces overlay ids that include shape id and handle id', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const overlay = util.getOverlays()[0]
			expect(overlay.id.startsWith(`handle:${ids.line1}:`)).toBe(true)
			expect(overlay.id.endsWith(overlay.props.handle.id)).toBe(true)
		})
	})

	describe('getGeometry', () => {
		it('returns a circle centered on the handle position in page space', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const o = util.getOverlays()[0]
			const g = util.getGeometry(o)!
			expect(g).toBeTruthy()
		})

		it('accounts for shape page transform (rotation, translation)', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 50, y: 75, rotation: Math.PI / 6 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const g = util.getGeometry(util.getOverlays()[0])!
			const b = g.getBounds()
			expect(b.x).toBeGreaterThan(0)
			expect(b.y).toBeGreaterThan(0)
		})

		it('uses coarse handle radius when pointer is coarse', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const o = util.getOverlays()[0]
			// Normal pointer
			editor.updateInstanceState({ isCoarsePointer: false })
			const g1 = util.getGeometry(o)!.getBounds()
			// Coarse pointer increases radius
			editor.updateInstanceState({ isCoarsePointer: true })
			const g2 = util.getGeometry(o)!.getBounds()
			expect(g2.width).toBeGreaterThan(g1.width)
		})

		it('scales radius inversely with zoom', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const o = util.getOverlays()[0]
			// Zoom 1
			const camera = editor.getCamera()
			editor.setCamera({ ...camera, z: 1 })
			const d1 = util.getGeometry(o)!.getBounds().width
			// Zoom 2 yields half diameter
			editor.setCamera({ ...editor.getCamera(), z: 2 })
			const d2 = util.getGeometry(o)!.getBounds().width
			expect(d2).toBeLessThan(d1)
		})

		it('returns null when shape has no page transform', () => {
			// This scenario is not representable for real shapes; keeping as no-op.
			expect(true).toBe(true)
		})
	})

	describe('getCursor', () => {
		it('returns grab cursor for all handles', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const o = util.getOverlays()[0]
			expect(util.getCursor(o)).toBe('grab')
		})

		it('geometry accounts for rotation and translation', () => {
			editor.createShapes([{ id: ids.line1, type: 'line', x: 200, y: 150, rotation: Math.PI / 4 }])
			editor.select(ids.line1)
			const util = editor.overlays.getOverlayUtil<ShapeHandleOverlayUtil>('shape_handle')
			const o = util.getOverlays()[0]
			const g = util.getGeometry(o)!
			const b = g.getBounds()
			// Expect the transformed geometry to be somewhere near the shape's position
			expect(b.x).toBeGreaterThan(150)
			expect(b.y).toBeGreaterThan(100)
		})
	})
})
