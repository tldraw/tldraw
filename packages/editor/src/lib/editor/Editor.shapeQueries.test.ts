import { PageRecordType } from '@tldraw/tlschema'
import {
	Box,
	Geometry2d,
	Mat,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLHandle,
	TLShape,
	Vec,
	createShapeId,
} from '../..'
import { TestEditor } from '../test/TestEditor'

const BOX_TYPE = 'my-custom-shape'
import { TEST_FRAME_TYPE as CONTAINER_TYPE } from '../test/testShapeTypes'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>
type IContainerShape = TLShape<typeof CONTAINER_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: shape.props.isFilled,
		})
	}
	override getHandles(shape: IBoxShape): TLHandle[] {
		return [
			{ id: 'start', type: 'vertex', index: 'a1' as any, x: 0, y: 0 },
			{ id: 'end', type: 'vertex', index: 'a2' as any, x: shape.props.w, y: shape.props.h },
		]
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class ContainerShapeUtil extends ShapeUtil<IContainerShape> {
	static override type = CONTAINER_TYPE
	static override props: RecordProps<IContainerShape> = {
		w: T.number,
		h: T.number,
	}
	getDefaultProps(): IContainerShape['props'] {
		return { w: 300, h: 300 }
	}
	getGeometry(shape: IContainerShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false })
	}
	override onDragShapesOver() {}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	d: createShapeId('d'),
	container: createShapeId('container'),
}

beforeEach(() => {
	editor = new TestEditor({
		shapeUtils: [BoxShapeUtil, ContainerShapeUtil],
		getShapeVisibility: (shape) => (shape.meta.hidden ? 'hidden' : 'inherit'),
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
})

afterEach(() => {
	editor.dispose()
})

describe('getShapeHandles', () => {
	it('returns the handles from the shape util for a shape or a shape id', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, props: { w: 50, h: 20 } })
		const expected = [
			{ id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
			{ id: 'end', type: 'vertex', index: 'a2', x: 50, y: 20 },
		]
		expect(editor.getShapeHandles(ids.a)).toEqual(expected)
		expect(editor.getShapeHandles(editor.getShape(ids.a)!)).toEqual(expected)
	})

	it('reflects prop changes', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, props: { w: 50, h: 20 } })
		editor.updateShape({ id: ids.a, type: BOX_TYPE, props: { w: 80, h: 90 } })
		expect(editor.getShapeHandles(ids.a)![1]).toMatchObject({ x: 80, y: 90 })
	})

	it('returns undefined for shapes whose util has no handles', () => {
		editor.createShape({ id: ids.container, type: CONTAINER_TYPE })
		expect(editor.getShapeHandles(ids.container)).toBeUndefined()
	})

	it('returns undefined for unknown shapes', () => {
		expect(editor.getShapeHandles(createShapeId('missing'))).toBeUndefined()
	})
})

describe('getShapeParentTransform', () => {
	it('is the identity for shapes whose parent is the page', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 10, y: 20, rotation: 1 })
		expect(editor.getShapeParentTransform(ids.a)).toEqual(Mat.Identity())
	})

	it('is the identity for unknown shapes', () => {
		expect(editor.getShapeParentTransform(createShapeId('missing'))).toEqual(Mat.Identity())
	})

	it('is the page transform of the parent shape', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 100, y: 50, rotation: Math.PI / 2 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container, x: 10, y: 10 },
		])
		const transform = editor.getShapeParentTransform(ids.a)
		expect(transform.point()).toMatchObject({ x: 100, y: 50 })
		expect(transform.rotation()).toBeCloseTo(Math.PI / 2)
		expect(transform).toEqual(editor.getShapePageTransform(ids.container))
	})

	it('composes nested parents', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 100, y: 100 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container, x: 10, y: 10, rotation: Math.PI },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.a, x: 5, y: 5 },
		])
		const transform = editor.getShapeParentTransform(editor.getShape(ids.b)!)
		expect(transform.point()).toMatchObject({ x: 110, y: 110 })
		expect(transform.rotation()).toBeCloseTo(Math.PI)
		// the child's page point is its local point run through the parent transform
		const pagePoint = transform.applyToPoint(new Vec(5, 5))
		expect(pagePoint.x).toBeCloseTo(105)
		expect(pagePoint.y).toBeCloseTo(105)
	})
})

describe('getShapeAncestors', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.a },
			{ id: ids.c, type: BOX_TYPE },
		])
	})

	it('returns an empty array for top level shapes', () => {
		expect(editor.getShapeAncestors(ids.c)).toEqual([])
	})

	it('returns ancestors ordered from the outermost to the direct parent', () => {
		expect(editor.getShapeAncestors(ids.b).map((s) => s.id)).toEqual([ids.container, ids.a])
		expect(editor.getShapeAncestors(editor.getShape(ids.b)!).map((s) => s.id)).toEqual([
			ids.container,
			ids.a,
		])
	})

	it('returns an empty array for unknown shapes', () => {
		expect(editor.getShapeAncestors(createShapeId('missing'))).toEqual([])
	})
})

describe('hasAncestor', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.a },
			{ id: ids.c, type: BOX_TYPE },
		])
	})

	it('is true for direct parents and grandparents', () => {
		expect(editor.hasAncestor(ids.b, ids.a)).toBe(true)
		expect(editor.hasAncestor(ids.b, ids.container)).toBe(true)
		expect(editor.hasAncestor(editor.getShape(ids.a), ids.container)).toBe(true)
	})

	it('is false for unrelated shapes, descendants, itself, and missing shapes', () => {
		expect(editor.hasAncestor(ids.c, ids.container)).toBe(false)
		expect(editor.hasAncestor(ids.a, ids.b)).toBe(false)
		expect(editor.hasAncestor(ids.a, ids.a)).toBe(false)
		expect(editor.hasAncestor(undefined, ids.a)).toBe(false)
		expect(editor.hasAncestor(createShapeId('missing'), ids.a)).toBe(false)
	})
})

describe('isShapeInPage', () => {
	it('checks against the current page by default', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		expect(editor.isShapeInPage(ids.a)).toBe(true)
		expect(editor.isShapeInPage(editor.getShape(ids.a)!)).toBe(true)
	})

	it('checks nested shapes against the given page', () => {
		const otherPageId = PageRecordType.createId('other')
		editor.createPage({ id: otherPageId, name: 'other' })
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container },
		])
		expect(editor.isShapeInPage(ids.a, editor.getCurrentPageId())).toBe(true)
		expect(editor.isShapeInPage(ids.a, otherPageId)).toBe(false)
	})

	it('is false for unknown shapes', () => {
		expect(editor.isShapeInPage(createShapeId('missing'))).toBe(false)
	})
})

describe('getShapeAndDescendantIds', () => {
	it('includes the shapes and all of their descendants', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.a },
			{ id: ids.c, type: BOX_TYPE },
		])
		expect(editor.getShapeAndDescendantIds([ids.container])).toEqual(
			new Set([ids.container, ids.a, ids.b])
		)
		expect(editor.getShapeAndDescendantIds([ids.a, ids.c])).toEqual(new Set([ids.a, ids.b, ids.c]))
	})

	it('skips unknown ids', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		expect(editor.getShapeAndDescendantIds([createShapeId('missing'), ids.a])).toEqual(
			new Set([ids.a])
		)
		expect(editor.getShapeAndDescendantIds([])).toEqual(new Set())
	})
})

describe('getShapeAtPoint', () => {
	it('hits a filled shape inside its bounds and misses outside', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })?.id).toBe(ids.a)
		expect(editor.getShapeAtPoint({ x: 150, y: 150 })).toBeUndefined()
	})

	it('returns the top-most filled shape', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 50, y: 50 },
		])
		expect(editor.getShapeAtPoint({ x: 75, y: 75 })?.id).toBe(ids.b)
		expect(editor.getShapeAtPoint({ x: 25, y: 25 })?.id).toBe(ids.a)
	})

	it('hits a hollow shape near its edge within the margin', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { isFilled: false } })
		expect(editor.getShapeAtPoint({ x: 104, y: 50 })).toBeUndefined()
		expect(editor.getShapeAtPoint({ x: 104, y: 50 }, { margin: 8 })?.id).toBe(ids.a)
		expect(editor.getShapeAtPoint({ x: 98, y: 50 }, { margin: 8 })?.id).toBe(ids.a)
	})

	it('only hits the inside of a hollow shape when hitInside is set', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { isFilled: false } })
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })).toBeUndefined()
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })?.id).toBe(ids.a)
	})

	it('prefers the smallest hollow shape containing the point', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 400, h: 400, isFilled: false } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 100, props: { w: 100, h: 100, isFilled: false } },
		])
		// b is above a but the point is only inside a
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })?.id).toBe(ids.a)
		// inside both, the smaller one wins
		expect(editor.getShapeAtPoint({ x: 150, y: 150 }, { hitInside: true })?.id).toBe(ids.b)
	})

	it('skips a hollow shape that contains the whole viewport', () => {
		editor.createShape({
			id: ids.a,
			type: BOX_TYPE,
			x: -1000,
			y: -1000,
			props: { w: 5000, h: 5000, isFilled: false },
		})
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })).toBeUndefined()
	})

	it('ignores locked shapes unless hitLocked is set', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0, isLocked: true })
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })).toBeUndefined()
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitLocked: true })?.id).toBe(ids.a)
	})

	it('ignores hidden shapes', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 0, y: 0, meta: { hidden: true } },
		])
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })?.id).toBe(ids.a)
	})

	it('applies the filter', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 0, y: 0 },
		])
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { filter: (s) => s.id !== ids.b })?.id).toBe(
			ids.a
		)
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { filter: () => false })).toBeUndefined()
	})

	it('hits shapes inside a rotated parent using the page point', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 200, y: 0, rotation: Math.PI / 2 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.container, x: 0, y: 0 },
		])
		// the child occupies page x: 100..200, y: 0..100 after the parent's rotation
		expect(editor.getShapeAtPoint({ x: 150, y: 50 })?.id).toBe(ids.a)
		expect(editor.getShapeAtPoint({ x: 250, y: 50 })).toBeUndefined()
	})
})

describe('getSelectedShapeAtPoint', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 50, y: 50 },
		])
	})

	it('only considers selected shapes', () => {
		expect(editor.getSelectedShapeAtPoint({ x: 75, y: 75 })).toBeUndefined()
		editor.select(ids.a)
		expect(editor.getSelectedShapeAtPoint({ x: 75, y: 75 })?.id).toBe(ids.a)
		expect(editor.getSelectedShapeAtPoint({ x: 125, y: 125 })).toBeUndefined()
	})

	it('returns the top-most selected shape', () => {
		editor.select(ids.a, ids.b)
		expect(editor.getSelectedShapeAtPoint({ x: 75, y: 75 })?.id).toBe(ids.b)
		expect(editor.getSelectedShapeAtPoint({ x: 25, y: 25 })?.id).toBe(ids.a)
	})
})

describe('getDraggingOverShape', () => {
	it('returns the shape under the point whose util handles drag interactions', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 0, y: 0 },
			{ id: ids.a, type: BOX_TYPE, x: 500, y: 500 },
		])
		const dragging = [editor.getShape(ids.a)!]
		expect(editor.getDraggingOverShape(new Vec(150, 150), dragging)?.id).toBe(ids.container)
		expect(editor.getDraggingOverShape(new Vec(400, 400), dragging)).toBeUndefined()
	})

	it('ignores shapes whose util has no drag handlers', () => {
		editor.createShapes([
			{ id: ids.b, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.a, type: BOX_TYPE, x: 500, y: 500 },
		])
		expect(editor.getDraggingOverShape(new Vec(50, 50), [editor.getShape(ids.a)!])).toBeUndefined()
	})

	it('never targets the dragging shapes or their descendants', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 0, y: 0 },
			{ id: ids.d, type: CONTAINER_TYPE, parentId: ids.container, x: 0, y: 0 },
		])
		const dragging = [editor.getShape(ids.container)!]
		expect(editor.getDraggingOverShape(new Vec(150, 150), dragging)).toBeUndefined()
	})

	it('ignores locked and hidden targets', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 0, y: 0, isLocked: true },
			{ id: ids.d, type: CONTAINER_TYPE, x: 0, y: 0, meta: { hidden: true } },
			{ id: ids.a, type: BOX_TYPE, x: 500, y: 500 },
		])
		expect(
			editor.getDraggingOverShape(new Vec(150, 150), [editor.getShape(ids.a)!])
		).toBeUndefined()
	})

	it('ignores the dragging shape when the point is inside a shape on top of it', () => {
		editor.createShapes([
			{ id: ids.container, type: CONTAINER_TYPE, x: 0, y: 0 },
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
		])
		// a is above the container and filled, but it is the shape being dragged
		expect(editor.getDraggingOverShape(new Vec(50, 50), [editor.getShape(ids.a)!])?.id).toBe(
			ids.container
		)
	})
})
