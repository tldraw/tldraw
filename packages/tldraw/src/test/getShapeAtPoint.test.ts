import {
	BaseFrameLikeShapeUtil,
	RecordProps,
	T,
	TLBaseShape,
	TLShape,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	frame1: createShapeId('frame1'),
}

let opts = {} as {
	hitInside?: boolean | undefined
	margin?: number | undefined
	hitLabels?: boolean | undefined
	hitFrameInside?: boolean | undefined
	filter?: ((shape: TLShape) => boolean) | undefined
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box4, type: 'geo', x: 75, y: -50, props: { w: 50, h: 100, fill: 'solid' } }, // overlapping box2
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 90, h: 90 } }, // overlapping box2
		{ id: ids.frame1, type: 'frame', x: 0, y: 500, props: { w: 500, h: 500 } }, // frame
	])
})

describe('with default options', () => {
	beforeEach(() => {
		opts = {}
	})

	it('misses shape', () => {
		expect(editor.getShapeAtPoint({ x: 0, y: 0 }, opts)?.id).toBe(undefined)
	})

	it('gets shape on edge', () => {
		expect(editor.getShapeAtPoint({ x: 100, y: 100 }, opts)?.id).toBe(ids.box1)
	})

	it('misses shape in empty space', () => {
		expect(editor.getShapeAtPoint({ x: 125, y: 125 }, opts)?.id).toBe(undefined)
	})

	it('misses shape in geo shape label', () => {
		expect(editor.getShapeAtPoint({ x: 150, y: 150 }, opts)?.id).toBe(undefined)
	})

	it('misses geo shape label behind overlapping hollow shape', () => {
		expect(editor.getShapeAtPoint({ x: 350, y: 350 }, opts)?.id).toBe(ids.box3)
	})

	it('hits solid shape behind overlapping hollow shape', () => {
		expect(editor.getShapeAtPoint({ x: 90, y: 10 }, opts)?.id).toBe(ids.box4)
	})

	it('missed overlapping shapes', () => {
		expect(editor.getShapeAtPoint({ x: 375, y: 375 }, opts)?.id).toBe(undefined)
	})

	it('does not hit frame inside', () => {
		expect(editor.getShapeAtPoint({ x: 50, y: 550 }, opts)?.id).toBe(undefined)
	})
})

describe('with hitInside=true', () => {
	beforeEach(() => {
		opts = {
			hitInside: true,
		}
	})

	it('misses shape', () => {
		expect(editor.getShapeAtPoint({ x: 0, y: 0 }, opts)?.id).toBe(undefined)
	})

	it('gets shape on edge', () => {
		expect(editor.getShapeAtPoint({ x: 100, y: 100 }, opts)?.id).toBe(ids.box1)
	})

	it('hits shape in empty space', () => {
		expect(editor.getShapeAtPoint({ x: 125, y: 125 }, opts)?.id).toBe(ids.box1)
	})

	it('gets shape in geo shape label', () => {
		expect(editor.getShapeAtPoint({ x: 150, y: 150 }, opts)?.id).toBe(ids.box1)
	})

	it('misses geo shape label behind overlapping hollow shape', () => {
		expect(editor.getShapeAtPoint({ x: 350, y: 350 }, opts)?.id).toBe(ids.box3)
	})

	it('hits solid shape behind overlapping hollow shape', () => {
		expect(editor.getShapeAtPoint({ x: 90, y: 10 }, opts)?.id).toBe(ids.box4)
	})

	it('hits overlapping shape', () => {
		expect(editor.getShapeAtPoint({ x: 375, y: 375 }, opts)?.id).toBe(ids.box3)
	})

	it('does not hit frame inside', () => {
		expect(editor.getShapeAtPoint({ x: 50, y: 550 }, opts)?.id).toBe(undefined)
	})
})

describe('with hitFrameInside=true', () => {
	beforeEach(() => {
		opts = {
			hitFrameInside: true,
		}
	})

	it('misses shape', () => {
		expect(editor.getShapeAtPoint({ x: 0, y: 0 }, opts)?.id).toBe(undefined)
	})

	it('gets shape on edge', () => {
		expect(editor.getShapeAtPoint({ x: 100, y: 100 }, opts)?.id).toBe(ids.box1)
	})

	it('misses shape in empty space', () => {
		expect(editor.getShapeAtPoint({ x: 125, y: 125 }, opts)?.id).toBe(undefined)
	})

	it('does not hit frame inside', () => {
		expect(editor.getShapeAtPoint({ x: 50, y: 550 }, opts)?.id).toBe(ids.frame1)
	})
})

describe('with hitLabels=true', () => {
	beforeEach(() => {
		opts = {
			hitLabels: true,
		}
	})

	it('gets shape in geo shape label', () => {
		expect(editor.getShapeAtPoint({ x: 150, y: 150 }, opts)?.id).toBe(ids.box1)
	})

	it('hits geo shape label behind overlapping hollow shape', () => {
		// label is empty
		expect(editor.getShapeAtPoint({ x: 350, y: 350 }, opts)?.id).toBe(ids.box3)
		editor.updateShape({
			id: ids.box2,
			type: 'geo',
			props: { richText: toRichText('hello') },
		})
		expect(editor.getShapeAtPoint({ x: 350, y: 350 }, opts)?.id).toBe(ids.box2)
	})
})

describe('with filter', () => {
	beforeEach(() => {
		opts = {
			filter: (shape) => shape.id !== ids.box2,
		}
	})

	it('hits filtered in', () => {
		expect(editor.getShapeAtPoint({ x: 100, y: 100 }, opts)?.id).toBe(ids.box1)
	})

	it('misses filtered out', () => {
		expect(editor.getShapeAtPoint({ x: 310, y: 310 }, opts)?.id).toBe(undefined)
	})
})

describe('frames', () => {
	it('hits frame label', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapes())
			.createShape({
				type: 'frame',
				x: 100,
				y: 100,
			})
			.pointerMove(-100, -100)

		const frame = editor.getLastCreatedShape()

		expect(editor.getHoveredShapeId()).toBe(null)

		editor.pointerMove(100, 90)

		expect(editor.getHoveredShapeId()).toBe(frame.id)

		editor.pointerDown().pointerUp()

		expect(editor.getOnlySelectedShape()).toBe(frame)
		expect(editor.getEditingShape()).toBe(undefined)
	})

	it('edits frame label', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapes()).createShape({
			type: 'frame',
			x: 100,
			y: 100,
		})

		const frame = editor.getLastCreatedShape()

		editor.pointerMove(100, 90).doubleClick()

		expect(editor.getOnlySelectedShape()).toBe(frame)
		expect(editor.getEditingShape()).toBe(frame)
	})
})

// Not registered in TLGlobalShapePropsMap; see getSvgString.test.ts.
const PLAIN_FRAME_TYPE = 'plain-frame'
type PlainFrameShape = TLBaseShape<typeof PLAIN_FRAME_TYPE, { w: number; h: number }>

describe('frame-like shapes with a plain geometry', () => {
	// inherits BaseBoxShapeUtil's Rectangle2d geometry, which has no label children
	class PlainFrameUtil extends BaseFrameLikeShapeUtil<any> {
		static override type = PLAIN_FRAME_TYPE
		static override props: RecordProps<PlainFrameShape> = { w: T.number, h: T.number }
		getDefaultProps() {
			return { w: 200, h: 200 }
		}
		component() {
			return null
		}
		getIndicatorPath(): undefined {
			return undefined
		}
	}

	it('can be hit tested', () => {
		editor = new TestEditor({ shapeUtils: [PlainFrameUtil] })
		editor.createShape({
			id: ids.frame1,
			type: PLAIN_FRAME_TYPE,
			x: 100,
			y: 100,
			props: { w: 200, h: 200 },
		} as any)
		expect(() => editor.getShapeAtPoint({ x: 150, y: 150 })).not.toThrow()
		// just outside the edge, within the margin
		expect(editor.getShapeAtPoint({ x: 98, y: 150 }, { margin: 4 })?.id).toBe(ids.frame1)
	})
})
