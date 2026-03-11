import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
} from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	inViewport: createShapeId('inViewport'),
	alsoInViewport: createShapeId('alsoInViewport'),
	offscreen: createShapeId('offscreen'),
	locked: createShapeId('locked'),
}

// Custom shape that cannot be culled (canCull returns false)
declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		'select-all-test-shape': { w: number; h: number }
	}
}

type ITestShape = TLShape<'select-all-test-shape'>

class NoCullShapeUtil extends ShapeUtil<ITestShape> {
	static override type = 'select-all-test-shape' as const
	static override props: RecordProps<ITestShape> = {
		w: T.number,
		h: T.number,
	}
	getDefaultProps(): ITestShape['props'] {
		return { w: 100, h: 100 }
	}
	getGeometry(shape: ITestShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}
	override canCull() {
		return false
	}
	indicator() {}
	component() {}
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.inViewport, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } },
		{ id: ids.alsoInViewport, type: 'geo', x: 200, y: 200, props: { w: 50, h: 50 } },
		{ id: ids.offscreen, type: 'geo', x: 5000, y: 5000, props: { w: 50, h: 50 } },
		{
			id: ids.locked,
			type: 'geo',
			x: 300,
			y: 300,
			props: { w: 50, h: 50 },
			isLocked: true,
		},
	])
})

afterEach(() => {
	editor?.dispose()
})

describe('selectAllInViewport', () => {
	it('selects only shapes visible in the viewport', () => {
		editor.selectAllInViewport()
		const selected = editor.getSelectedShapeIds()
		expect(selected).toContain(ids.inViewport)
		expect(selected).toContain(ids.alsoInViewport)
		expect(selected).not.toContain(ids.offscreen)
	})

	it('does not select locked shapes', () => {
		editor.selectAllInViewport()
		expect(editor.getSelectedShapeIds()).not.toContain(ids.locked)
	})

	it('selects nothing when no shapes are in the viewport', () => {
		editor.setCamera({ x: -9000, y: -9000, z: 1 })
		editor.selectAllInViewport()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects shapes that come into view after panning', () => {
		// Pan so only the offscreen shape is visible
		editor.setCamera({ x: -4900, y: -4900, z: 1 })
		editor.selectAllInViewport()
		const selected = editor.getSelectedShapeIds()
		expect(selected).toContain(ids.offscreen)
		expect(selected).not.toContain(ids.inViewport)
		expect(selected).not.toContain(ids.alsoInViewport)
	})

	it('does not select off-screen shapes with canCull returning false', () => {
		const testEditor = new TestEditor({ shapeUtils: [NoCullShapeUtil] })
		testEditor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
		testEditor.setCamera({ x: 0, y: 0, z: 1 })

		const inViewportId = createShapeId('visible')
		const offscreenNoCullId = createShapeId('offscreen-no-cull')

		testEditor.createShapes([
			{ id: inViewportId, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } },
			{ id: offscreenNoCullId, type: 'select-all-test-shape', x: 5000, y: 5000 },
		])

		testEditor.selectAllInViewport()
		const selected = testEditor.getSelectedShapeIds()
		expect(selected).toContain(inViewportId)
		expect(selected).not.toContain(offscreenNoCullId)

		testEditor.dispose()
	})
})
