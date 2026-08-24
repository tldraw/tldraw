import { TLBaseShape, createShapeId } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { TLResizeHandle } from '../../types/selection-types'
import { TLResizeInfo } from '../ShapeUtil'
import { resizeScaled } from './resizeScaled'

type ScaledShape = TLBaseShape<'scaled', { scale: number }>

function makeShape(partial: Partial<ScaledShape> = {}): ScaledShape {
	return {
		id: createShapeId('scaled'),
		typeName: 'shape',
		type: 'scaled',
		x: 0,
		y: 0,
		rotation: 0,
		index: 'a1',
		parentId: 'page:page',
		isLocked: false,
		opacity: 1,
		meta: {},
		props: { scale: 1 },
		...partial,
	} as ScaledShape
}

function makeInfo(shape: ScaledShape, partial: Partial<TLResizeInfo<any>> = {}): TLResizeInfo<any> {
	return {
		newPoint: new Vec(shape.x, shape.y),
		handle: 'bottom_right',
		mode: 'scale_shape',
		scaleX: 1,
		scaleY: 1,
		initialBounds: new Box(0, 0, 100, 50),
		initialShape: shape,
		...partial,
	}
}

describe('resizeScaled', () => {
	it('returns only the position and the new scale', () => {
		const shape = makeShape()
		expect(resizeScaled(shape, makeInfo(shape, { newPoint: new Vec(10, 20), scaleX: 2 }))).toEqual({
			x: 10,
			y: 20,
			props: { scale: 2 },
		})
	})

	it.each(['top_left', 'top_right', 'bottom_left', 'bottom_right'] as TLResizeHandle[])(
		'uses the larger absolute axis scale from the %s corner',
		(handle) => {
			const shape = makeShape()
			expect(resizeScaled(shape, makeInfo(shape, { handle, scaleX: 0.5, scaleY: 3 }))).toEqual({
				x: 0,
				y: 0,
				props: { scale: 3 },
			})
			expect(resizeScaled(shape, makeInfo(shape, { handle, scaleX: -4, scaleY: 2 }))).toMatchObject(
				{ props: { scale: 4 } }
			)
		}
	)

	it.each(['left', 'right'] as TLResizeHandle[])('uses only scaleX from the %s edge', (handle) => {
		const shape = makeShape()
		expect(resizeScaled(shape, makeInfo(shape, { handle, scaleX: 0.5, scaleY: 3 }))).toEqual({
			x: 0,
			y: 0,
			props: { scale: 0.5 },
		})
	})

	it.each(['top', 'bottom'] as TLResizeHandle[])('uses only scaleY from the %s edge', (handle) => {
		const shape = makeShape()
		expect(resizeScaled(shape, makeInfo(shape, { handle, scaleX: 3, scaleY: 0.25 }))).toEqual({
			x: 0,
			y: 0,
			props: { scale: 0.25 },
		})
	})

	it('multiplies the existing scale', () => {
		const shape = makeShape({ props: { scale: 0.5 } })
		expect(resizeScaled(shape, makeInfo(shape, { scaleX: 2, scaleY: 2 }))).toMatchObject({
			props: { scale: 1 },
		})
	})

	it('clamps the scale delta to a minimum of 0.01', () => {
		const shape = makeShape({ props: { scale: 2 } })
		expect(resizeScaled(shape, makeInfo(shape, { scaleX: 0, scaleY: 0.001 }))).toMatchObject({
			props: { scale: 0.02 },
		})
	})

	it('offsets x by the scaled initial width when flipped horizontally', () => {
		const shape = makeShape()
		expect(
			resizeScaled(
				shape,
				makeInfo(shape, { newPoint: new Vec(300, 10), handle: 'right', scaleX: -2, scaleY: 1 })
			)
		).toEqual({ x: 100, y: 10, props: { scale: 2 } })
	})

	it('offsets y by the scaled initial height when flipped vertically', () => {
		const shape = makeShape()
		expect(
			resizeScaled(
				shape,
				makeInfo(shape, { newPoint: new Vec(10, 100), handle: 'bottom', scaleX: 1, scaleY: -1 })
			)
		).toEqual({ x: 10, y: 50, props: { scale: 1 } })
	})

	it('rotates the flip offset by the shape rotation', () => {
		const shape = makeShape({ rotation: Math.PI / 2 })
		const result = resizeScaled(
			shape,
			makeInfo(shape, { newPoint: new Vec(0, 0), handle: 'top_left', scaleX: -1, scaleY: -1 })
		)
		// offset (-100, -50) rotated 90 degrees is (50, -100)
		expect(result.x).toBeCloseTo(50)
		expect(result.y).toBeCloseTo(-100)
		expect(result.props).toEqual({ scale: 1 })
	})

	it('throws on an unknown handle', () => {
		const shape = makeShape()
		expect(() =>
			resizeScaled(shape, makeInfo(shape, { handle: 'middle' as unknown as TLResizeHandle }))
		).toThrow()
	})
})
