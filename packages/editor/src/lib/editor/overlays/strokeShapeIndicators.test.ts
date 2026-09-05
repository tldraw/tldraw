import { RecordProps, TLShape, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { vi } from 'vitest'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { TestEditor } from '../../test/TestEditor'
import { ShapeUtil, TLIndicatorPath } from '../shapes/ShapeUtil'
import { strokeShapeIndicators } from './strokeShapeIndicators'

const INDICATOR_SHAPE = 'indicator-box'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[INDICATOR_SHAPE]: { w: number; h: number; mode: 'path' | 'object' | 'clipped' | 'none' }
	}
}

type IndicatorShape = TLShape<typeof INDICATOR_SHAPE>

class IndicatorShapeUtil extends ShapeUtil<IndicatorShape> {
	static override type = INDICATOR_SHAPE
	static override props: RecordProps<IndicatorShape> = {
		w: T.number,
		h: T.number,
		mode: T.literalEnum('path', 'object', 'clipped', 'none'),
	}
	getDefaultProps(): IndicatorShape['props'] {
		return { w: 100, h: 50, mode: 'path' }
	}
	getGeometry(shape: IndicatorShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false })
	}
	getIndicatorPath(shape: IndicatorShape): TLIndicatorPath | undefined {
		const { w, h, mode } = shape.props
		const path = new Path2D()
		path.rect(0, 0, w, h)
		switch (mode) {
			case 'path':
				return path
			case 'object': {
				const extra = new Path2D()
				extra.rect(10, 10, 5, 5)
				return { path, additionalPaths: [extra] }
			}
			case 'clipped': {
				const clipPath = new Path2D()
				clipPath.rect(1, 1, 2, 2)
				const extra = new Path2D()
				extra.rect(20, 20, 5, 5)
				return { path, clipPath, additionalPaths: [extra] }
			}
			case 'none':
				return undefined
		}
	}
	component() {}
}

// vitest-canvas-mock records every context call, so the events list is the
// ground truth for what was stroked and in which order.
type MockContext = CanvasRenderingContext2D & {
	__getEvents(): { type: string; props: Record<string, any> }[]
}

let editor: TestEditor
let ctx: MockContext

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [IndicatorShapeUtil] })
	ctx = document.createElement('canvas').getContext('2d') as MockContext
})

afterEach(() => {
	editor.dispose()
})

function createShape(
	id: ReturnType<typeof createShapeId>,
	partial: Partial<IndicatorShape['props']> = {},
	rest: Partial<Omit<IndicatorShape, 'props' | 'id' | 'type'>> = {}
) {
	editor.createShape<IndicatorShape>({ id, type: INDICATOR_SHAPE, props: partial, ...rest })
	return editor.getShape<IndicatorShape>(id)!
}

function strokeEvents() {
	return ctx.__getEvents().filter((e) => e.type === 'stroke')
}

function rectsIn(event: { props: Record<string, any> }) {
	return event.props.path
		.filter((p: any) => p.type === 'rect')
		.map((p: any) => [p.props.x, p.props.y, p.props.width, p.props.height])
}

describe('strokeShapeIndicators', () => {
	it('does nothing for an empty list', () => {
		strokeShapeIndicators(editor, ctx, [])
		expect(ctx.__getEvents()).toEqual([])
	})

	it('batches plain Path2D indicators into a single stroke', () => {
		const a = createShapeId('a')
		const b = createShapeId('b')
		createShape(a, { w: 100, h: 50 })
		createShape(b, { w: 20, h: 30 })

		strokeShapeIndicators(editor, ctx, [a, b])

		const strokes = strokeEvents()
		expect(strokes).toHaveLength(1)
		expect(rectsIn(strokes[0])).toEqual([
			[0, 0, 100, 50],
			[0, 0, 20, 30],
		])
		expect(ctx.save).not.toHaveBeenCalled()
		expect(ctx.clip).not.toHaveBeenCalled()
	})

	it('skips missing and locked shapes but still strokes the rest', () => {
		const a = createShapeId('a')
		const locked = createShapeId('locked')
		createShape(a)
		createShape(locked, {}, { isLocked: true })

		strokeShapeIndicators(editor, ctx, [createShapeId('missing'), locked, a])

		const strokes = strokeEvents()
		expect(strokes).toHaveLength(1)
		expect(rectsIn(strokes[0])).toEqual([[0, 0, 100, 50]])
	})

	it('skips shapes whose util returns no indicator path', () => {
		const a = createShapeId('a')
		createShape(a, { mode: 'none' })

		strokeShapeIndicators(editor, ctx, [a])

		const strokes = strokeEvents()
		expect(strokes).toHaveLength(1)
		expect(rectsIn(strokes[0])).toEqual([])
	})

	it('batches object-form indicators together with their additional paths', () => {
		const a = createShapeId('a')
		createShape(a, { mode: 'object' })

		strokeShapeIndicators(editor, ctx, [a])

		const strokes = strokeEvents()
		expect(strokes).toHaveLength(1)
		expect(rectsIn(strokes[0])).toEqual([
			[0, 0, 100, 50],
			[10, 10, 5, 5],
		])
	})

	it('strokes clipped indicators individually inside the shape transform', () => {
		const a = createShapeId('a')
		const b = createShapeId('b')
		createShape(a, { mode: 'clipped' }, { x: 10, y: 20 })
		createShape(b, { w: 7, h: 7 })

		strokeShapeIndicators(editor, ctx, [a, b])

		expect(ctx.__getEvents().map((e) => e.type)).toEqual([
			'save',
			'transform',
			'save',
			'clip',
			'stroke',
			'restore',
			'stroke',
			'restore',
			'stroke',
		])
		expect(ctx.transform).toHaveBeenCalledWith(1, 0, 0, 1, 10, 20)
		expect(ctx.clip).toHaveBeenCalledWith(expect.any(Path2D), 'evenodd')

		const strokes = strokeEvents()
		expect(rectsIn(strokes[0])).toEqual([[0, 0, 100, 50]])
		expect(rectsIn(strokes[1])).toEqual([[20, 20, 5, 5]])
		// the batched stroke only carries the unclipped shape
		expect(rectsIn(strokes[2])).toEqual([[0, 0, 7, 7]])
	})

	it('applies the full page transform of rotated and nested shapes', () => {
		const parent = createShapeId('parent')
		const child = createShapeId('child')
		createShape(parent, { mode: 'clipped' }, { x: 100, y: 100, rotation: Math.PI / 2 })
		createShape(child, { mode: 'clipped' }, { x: 10, y: 0, parentId: parent })

		strokeShapeIndicators(editor, ctx, [child])

		const [a, b, c, d, e, f] = (ctx.transform as ReturnType<typeof vi.fn>).mock.calls[0]
		expect(a).toBeCloseTo(0)
		expect(b).toBeCloseTo(1)
		expect(c).toBeCloseTo(-1)
		expect(d).toBeCloseTo(0)
		expect(e).toBeCloseTo(100)
		expect(f).toBeCloseTo(110)
	})

	it('caches indicator paths until the shape props change', () => {
		const a = createShapeId('a')
		createShape(a)
		const util = editor.getShapeUtil<IndicatorShapeUtil>(INDICATOR_SHAPE)
		const spy = vi.spyOn(util, 'getIndicatorPath')

		strokeShapeIndicators(editor, ctx, [a])
		strokeShapeIndicators(editor, ctx, [a])
		expect(spy).toHaveBeenCalledTimes(1)

		editor.updateShape<IndicatorShape>({ id: a, type: INDICATOR_SHAPE, x: 50 })
		strokeShapeIndicators(editor, ctx, [a])
		expect(spy).toHaveBeenCalledTimes(1)

		editor.updateShape<IndicatorShape>({ id: a, type: INDICATOR_SHAPE, props: { w: 1 } })
		strokeShapeIndicators(editor, ctx, [a])
		expect(spy).toHaveBeenCalledTimes(2)
		expect(rectsIn(strokeEvents().at(-1)!)).toEqual([[0, 0, 1, 50]])

		spy.mockRestore()
	})
})
