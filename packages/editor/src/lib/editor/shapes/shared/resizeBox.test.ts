import { TLShape, createShapeId } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { TLResizeHandle } from '../../types/selection-types'
import { TLResizeMode } from '../ShapeUtil'
import { resizeBox } from './resizeBox'

type TestBoxShape = TLShape<'geo'>

function makeShape(partial: Partial<TestBoxShape> = {}): TestBoxShape {
	return {
		id: createShapeId('box'),
		typeName: 'shape',
		type: 'geo',
		x: 0,
		y: 0,
		rotation: 0,
		index: 'a1',
		parentId: 'page:page' as any,
		isLocked: false,
		opacity: 1,
		meta: {},
		props: { w: 100, h: 50 },
		...partial,
	} as unknown as TestBoxShape
}

function makeInfo(
	shape: TestBoxShape,
	partial: Partial<{
		newPoint: Vec
		handle: TLResizeHandle
		mode: TLResizeMode
		scaleX: number
		scaleY: number
	}> = {}
) {
	return {
		newPoint: new Vec(shape.x, shape.y),
		handle: 'bottom_right' as TLResizeHandle,
		mode: 'resize_bounds' as TLResizeMode,
		scaleX: 1,
		scaleY: 1,
		initialBounds: new Box(0, 0, (shape.props as any).w, (shape.props as any).h),
		initialShape: shape,
		...partial,
	}
}

const LEFT_HANDLES: TLResizeHandle[] = ['top_left', 'left', 'bottom_left']
const TOP_HANDLES: TLResizeHandle[] = ['top_left', 'top', 'top_right']

describe('resizeBox', () => {
	it('scales the width and height and moves the shape to the new point', () => {
		const shape = makeShape()
		const result = resizeBox(
			shape,
			makeInfo(shape, { newPoint: new Vec(10, 20), scaleX: 2, scaleY: 0.5 })
		)
		expect(result).toEqual({ ...shape, x: 10, y: 20, props: { w: 200, h: 25 } })
	})

	it('returns only w and h in props', () => {
		const shape = makeShape({ props: { w: 100, h: 50, color: 'red' } as any })
		const result = resizeBox(shape, makeInfo(shape, { scaleX: 1, scaleY: 1 }))
		expect(result.props).toEqual({ w: 100, h: 50 })
	})

	it('ignores the mode and initial bounds', () => {
		const shape = makeShape()
		const a = resizeBox(shape, makeInfo(shape, { scaleX: 2, mode: 'resize_bounds' }))
		const b = resizeBox(shape, {
			...makeInfo(shape, { scaleX: 2, mode: 'scale_shape' }),
			initialBounds: new Box(999, 999, 1, 1),
		})
		expect(a).toEqual(b)
	})

	describe('flipping', () => {
		it('flips horizontally by offsetting x by the negative width', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(50, 0), handle: 'right', scaleX: -1 })
			)
			expect(result).toMatchObject({ x: -50, y: 0, props: { w: 100, h: 50 } })
		})

		it('flips vertically by offsetting y by the negative height', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 30), handle: 'bottom', scaleY: -2 })
			)
			expect(result).toMatchObject({ x: 0, y: -70, props: { w: 100, h: 100 } })
		})

		it('flips both axes at once from a corner', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, {
					newPoint: new Vec(100, 100),
					handle: 'bottom_right',
					scaleX: -0.5,
					scaleY: -1,
				})
			)
			expect(result).toMatchObject({ x: 50, y: 50, props: { w: 50, h: 50 } })
		})

		it('rotates the flip offset into the shape rotation', () => {
			const shape = makeShape({ rotation: Math.PI / 2 })
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 0), handle: 'right', scaleX: -1 })
			)
			// offset (-100, 0) rotated 90 degrees is (0, -100)
			expect(result.x).toBeCloseTo(0)
			expect(result.y).toBeCloseTo(-100)
			expect(result.props).toEqual({ w: 100, h: 50 })
		})
	})

	describe('minimum size', () => {
		it('clamps to a 1x1 minimum by default', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { handle: 'bottom_right', scaleX: 0.001, scaleY: 0.001 })
			)
			expect(result).toMatchObject({ x: 0, y: 0, props: { w: 1, h: 1 } })
		})

		it('collapses a zero scale to the minimum size', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(10, 10), handle: 'bottom_right', scaleX: 0, scaleY: 0 })
			)
			expect(result).toMatchObject({ x: 9, y: 9, props: { w: 1, h: 1 } })
		})

		it.each(LEFT_HANDLES)(
			'offsets x by the shortfall when clamping width from the %s handle',
			(handle) => {
				const shape = makeShape()
				const result = resizeBox(
					shape,
					makeInfo(shape, { newPoint: new Vec(10, 0), handle, scaleX: 0.001 }),
					{ minWidth: 10 }
				)
				// w would be 0.1, so the shape moves back by 0.1 - 10
				expect(result.x).toBeCloseTo(0.1)
				expect(result.props.w).toBe(10)
			}
		)

		it('offsets x by half the shortfall when clamping width from the top or bottom handle', () => {
			const shape = makeShape()
			for (const handle of ['top', 'bottom'] as const) {
				const result = resizeBox(
					shape,
					makeInfo(shape, { newPoint: new Vec(10, 0), handle, scaleX: 0.001 }),
					{ minWidth: 10 }
				)
				expect(result.x).toBeCloseTo(10 + (0.1 - 10) / 2)
				expect(result.props.w).toBe(10)
			}
		})

		it('does not offset x when clamping width from a right handle', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(10, 0), handle: 'right', scaleX: 0.001 }),
				{ minWidth: 10 }
			)
			expect(result).toMatchObject({ x: 10, props: { w: 10 } })
		})

		it.each(TOP_HANDLES)(
			'offsets y by the shortfall when clamping height from the %s handle',
			(handle) => {
				const shape = makeShape()
				const result = resizeBox(
					shape,
					makeInfo(shape, { newPoint: new Vec(0, 10), handle, scaleY: 0.001 }),
					{ minHeight: 10 }
				)
				expect(result.y).toBeCloseTo(10 + (0.05 - 10))
				expect(result.props.h).toBe(10)
			}
		)

		it('offsets y by half the shortfall when clamping height from the left or right handle', () => {
			const shape = makeShape()
			for (const handle of ['left', 'right'] as const) {
				const result = resizeBox(
					shape,
					makeInfo(shape, { newPoint: new Vec(0, 10), handle, scaleY: 0.001 }),
					{ minHeight: 10 }
				)
				expect(result.y).toBeCloseTo(10 + (0.05 - 10) / 2)
				expect(result.props.h).toBe(10)
			}
		})

		it('does not offset y when clamping height from a bottom handle', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 10), handle: 'bottom', scaleY: 0.001 }),
				{ minHeight: 10 }
			)
			expect(result).toMatchObject({ y: 10, props: { h: 10 } })
		})

		it('keeps a flipped left-handle resize anchored at its (negative) width', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(10, 0), handle: 'left', scaleX: -0.001 }),
				{ minWidth: 10 }
			)
			// w is -0.1 -> 0.1 < 10, left handle offsets by -0.1
			expect(result.x).toBeCloseTo(9.9)
			expect(result.props.w).toBe(10)
		})

		it('offsets a flipped right-handle resize by the full minimum width', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(10, 0), handle: 'right', scaleX: -0.001 }),
				{ minWidth: 10 }
			)
			expect(result).toMatchObject({ x: 0, props: { w: 10 } })
		})

		it('keeps a flipped top-handle resize anchored at its (negative) height', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 10), handle: 'top', scaleY: -0.001 }),
				{ minHeight: 10 }
			)
			expect(result.y).toBeCloseTo(9.95)
			expect(result.props.h).toBe(10)
		})

		it('offsets a flipped bottom-handle resize by the full minimum height', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 10), handle: 'bottom', scaleY: -0.001 }),
				{ minHeight: 10 }
			)
			expect(result).toMatchObject({ y: 0, props: { h: 10 } })
		})
	})

	describe('maximum size', () => {
		it('clamps width and height without moving the shape', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(5, 5), scaleX: 10, scaleY: 10 }),
				{ maxWidth: 500, maxHeight: 200 }
			)
			expect(result).toMatchObject({ x: 5, y: 5, props: { w: 500, h: 200 } })
		})

		it('clamps the absolute size of a flipped resize', () => {
			const shape = makeShape()
			const result = resizeBox(
				shape,
				makeInfo(shape, { newPoint: new Vec(0, 0), handle: 'left', scaleX: -10 }),
				{ maxWidth: 500 }
			)
			// the offset still uses the unclamped width
			expect(result).toMatchObject({ x: -1000, props: { w: 500, h: 50 } })
		})
	})
})
