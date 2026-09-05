import {
	RecordProps,
	TLHandle,
	TLShape,
	TLShapeId,
	VecModel,
	createShapeId,
	vecModelValidator,
} from '@tldraw/tlschema'
import { ZERO_INDEX_KEY } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { Polyline2d } from '../../../primitives/geometry/Polyline2d'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { Vec } from '../../../primitives/Vec'
import { TestEditor } from '../../../test/TestEditor'
import { ShapeUtil } from '../../shapes/ShapeUtil'
import { HandleSnapGeometry } from './HandleSnaps'

const HANDLE_BOX = 'handle-box'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[HANDLE_BOX]: {
			w: number
			h: number
			canSnap: boolean
			handleOutline: 'default' | 'none' | 'diagonal'
			handlePoints: VecModel[]
			selfSnap: boolean
		}
	}
}

type HandleBoxShape = TLShape<typeof HANDLE_BOX>

class HandleBoxUtil extends ShapeUtil<HandleBoxShape> {
	static override type = HANDLE_BOX
	static override props: RecordProps<HandleBoxShape> = {
		w: T.number,
		h: T.number,
		canSnap: T.boolean,
		handleOutline: T.literalEnum('default', 'none', 'diagonal'),
		handlePoints: T.arrayOf(vecModelValidator),
		selfSnap: T.boolean,
	}
	getDefaultProps(): HandleBoxShape['props'] {
		return {
			w: 100,
			h: 100,
			canSnap: true,
			handleOutline: 'default',
			handlePoints: [],
			selfSnap: false,
		}
	}
	getGeometry(shape: HandleBoxShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override canSnap(shape: HandleBoxShape) {
		return shape.props.canSnap
	}
	override getHandleSnapGeometry(shape: HandleBoxShape): HandleSnapGeometry {
		const { w, h, handleOutline, handlePoints, selfSnap } = shape.props
		return {
			outline:
				handleOutline === 'default'
					? undefined
					: handleOutline === 'none'
						? null
						: new Polyline2d({ points: [new Vec(0, 0), new Vec(w, h)] }),
			points: handlePoints,
			getSelfSnapOutline: selfSnap ? () => this.getGeometry(shape) : undefined,
			getSelfSnapPoints: selfSnap ? () => [{ x: w / 2, y: h / 2 }] : undefined,
		}
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

let editor: TestEditor
let current: TLShapeId
let other: TLShapeId

function createBox(
	id: TLShapeId,
	x: number,
	y: number,
	extra: Partial<Omit<HandleBoxShape, 'props'>> & { props?: Partial<HandleBoxShape['props']> } = {}
) {
	const { props, ...rest } = extra
	editor.createShape<HandleBoxShape>({ id, type: HANDLE_BOX, x, y, ...rest, props })
	return id
}

function updateProps(id: TLShapeId, props: Partial<HandleBoxShape['props']>) {
	editor.updateShape<HandleBoxShape>({ id, type: HANDLE_BOX, props })
}

function makeHandle(
	x: number,
	y: number,
	snap: Pick<TLHandle, 'snapType' | 'canSnap'> = { snapType: 'point' }
): TLHandle {
	return { id: 'handle', type: 'vertex', index: ZERO_INDEX_KEY, x, y, ...snap }
}

// Handles are given in the current shape's local space; the current shape sits at (200, 200),
// so a page point is converted by subtracting that offset.
function snapHandleAtPagePoint(
	pageX: number,
	pageY: number,
	snap?: Pick<TLHandle, 'snapType' | 'canSnap'>
) {
	return editor.snaps.handles.snapHandle({
		currentShapeId: current,
		handle: makeHandle(pageX - 200, pageY - 200, snap),
	})
}

function getIndicatorPoints() {
	return editor.snaps.getIndicators().map((indicator) => {
		if (indicator.type !== 'points') throw new Error('expected a points indicator')
		return indicator.points.map((p) => [
			Math.round(p.x * 1000) / 1000,
			Math.round(p.y * 1000) / 1000,
		])
	})
}

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [HandleBoxUtil] })
	other = createBox(createShapeId('other'), 0, 0)
	current = createBox(createShapeId('current'), 200, 200)
	// the shape whose handle is being dragged is selected, as it would be in the select tool
	editor.select(current)
})

afterEach(() => {
	editor.dispose()
})

describe('point snapping', () => {
	it('snaps to the nearest point on the outline of another shape', () => {
		const result = snapHandleAtPagePoint(105, 50)

		expect(result?.nudge).toMatchObject({ x: -5, y: 0 })
		expect(getIndicatorPoints()).toEqual([[[100, 50]]])
	})

	it('snaps to a corner when that is the nearest outline point', () => {
		const result = snapHandleAtPagePoint(103, 104)

		expect(result?.nudge).toMatchObject({ x: -3, y: -4 })
		expect(getIndicatorPoints()).toEqual([[[100, 100]]])
	})

	it('returns null when nothing is within the snap threshold', () => {
		expect(snapHandleAtPagePoint(110, 50)).toBeNull()
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('does not snap at exactly the snap threshold', () => {
		expect(snapHandleAtPagePoint(107.9, 50)?.nudge.x).toBeCloseTo(-7.9)
		expect(snapHandleAtPagePoint(108, 50)).toBeNull()
	})

	it('scales the threshold with the zoom level', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })

		expect(snapHandleAtPagePoint(105, 50)).toBeNull()
		expect(snapHandleAtPagePoint(103, 50)?.nudge).toMatchObject({ x: -3, y: 0 })
	})

	it('leaves the previous indicators in place when there is no snap', () => {
		snapHandleAtPagePoint(105, 50)
		expect(editor.snaps.getIndicators()).toHaveLength(1)

		expect(snapHandleAtPagePoint(150, 50)).toBeNull()
		expect(editor.snaps.getIndicators()).toHaveLength(1)
	})

	it('prefers custom snap points over the outline even when the outline is closer', () => {
		updateProps(other, { handlePoints: [{ x: 92, y: 50 }] })

		// the right edge is 3 away, the custom point is 5 away
		const result = snapHandleAtPagePoint(97, 50)

		expect(result?.nudge).toMatchObject({ x: -5, y: 0 })
		expect(getIndicatorPoints()).toEqual([[[92, 50]]])
	})

	it('picks the nearest of several custom snap points', () => {
		updateProps(other, {
			handlePoints: [
				{ x: 0, y: 0 },
				{ x: 100, y: 100 },
				{ x: 100, y: 90 },
			],
		})

		const result = snapHandleAtPagePoint(97, 96)

		expect(result?.nudge).toMatchObject({ x: 3, y: 4 })
		expect(getIndicatorPoints()).toEqual([[[100, 100]]])
	})

	it('transforms custom snap points into page space', () => {
		updateProps(other, { handlePoints: [{ x: 50, y: 50 }] })
		editor.updateShape<HandleBoxShape>({ id: other, type: HANDLE_BOX, x: 400, y: 0 })

		const result = snapHandleAtPagePoint(453, 46)

		expect(result?.nudge).toMatchObject({ x: -3, y: 4 })
		expect(getIndicatorPoints()).toEqual([[[450, 50]]])
	})

	it('does not snap to the outline of a shape that disables it', () => {
		updateProps(other, { handleOutline: 'none' })

		expect(snapHandleAtPagePoint(105, 50)).toBeNull()
	})

	it('still snaps to the custom points of a shape whose outline is disabled', () => {
		updateProps(other, { handleOutline: 'none', handlePoints: [{ x: 100, y: 50 }] })

		expect(snapHandleAtPagePoint(105, 50)?.nudge).toMatchObject({ x: -5, y: 0 })
	})

	it('snaps to a custom outline instead of the shape geometry', () => {
		updateProps(other, { handleOutline: 'diagonal' })

		// (52, 48) is nowhere near the rectangle's edges, but 2.8 from the diagonal at (50, 50)
		const result = snapHandleAtPagePoint(52, 48)

		expect(result?.nudge.x).toBeCloseTo(-2)
		expect(result?.nudge.y).toBeCloseTo(2)
		expect(getIndicatorPoints()).toEqual([[[50, 50]]])

		// and the rectangle's right edge is no longer a target
		expect(snapHandleAtPagePoint(105, 50)).toBeNull()
	})

	it('picks the closest outline across several shapes', () => {
		createBox(createShapeId('third'), 108, 0)

		// 5 from other's right edge at 100, 3 from third's left edge at 108
		const result = snapHandleAtPagePoint(105, 50)

		expect(result?.nudge).toMatchObject({ x: 3, y: 0 })
		expect(getIndicatorPoints()).toEqual([[[108, 50]]])
	})

	it('does not snap to the current shape itself by default', () => {
		// (305, 250) is 5 from the current shape's own right edge
		expect(snapHandleAtPagePoint(305, 250)).toBeNull()
	})

	it('snaps to the self snap outline when the util provides one', () => {
		updateProps(current, { selfSnap: true })

		const result = snapHandleAtPagePoint(305, 250)

		expect(result?.nudge).toMatchObject({ x: -5, y: 0 })
		expect(getIndicatorPoints()).toEqual([[[300, 250]]])
	})

	it('snaps to the self snap points when the util provides them', () => {
		updateProps(current, { selfSnap: true })

		// the self snap point is the center at (250, 250)
		const result = snapHandleAtPagePoint(253, 253)

		expect(result?.nudge).toMatchObject({ x: -3, y: -3 })
		expect(getIndicatorPoints()).toEqual([[[250, 250]]])
	})

	it('does not snap to selected shapes', () => {
		editor.select(other)

		expect(snapHandleAtPagePoint(105, 50)).toBeNull()
	})

	it('does not snap to shapes that cannot snap', () => {
		updateProps(other, { canSnap: false })

		expect(snapHandleAtPagePoint(105, 50)).toBeNull()
	})

	it('does not snap to shapes outside the viewport', () => {
		editor.updateShape<HandleBoxShape>({ id: other, type: HANDLE_BOX, x: 2000, y: 0 })

		expect(snapHandleAtPagePoint(2005, 50)).toBeNull()
	})

	it('converts the handle through the current shape rotation', () => {
		editor.updateShape<HandleBoxShape>({
			id: current,
			type: HANDLE_BOX,
			rotation: Math.PI / 2,
		})
		editor.updateShape<HandleBoxShape>({ id: other, type: HANDLE_BOX, x: 0, y: 200 })

		// rotating local (50, 95) by 90 degrees around (200, 200) gives page (105, 250)
		const result = editor.snaps.handles.snapHandle({
			currentShapeId: current,
			handle: makeHandle(50, 95),
		})

		expect(result?.nudge.x).toBeCloseTo(-5)
		expect(result?.nudge.y).toBeCloseTo(0)
		expect(getIndicatorPoints()).toEqual([[[100, 250]]])
	})

	it('converts the handle through the parent transform', () => {
		const parent = createBox(createShapeId('parent'), 100, 100, { props: { w: 500, h: 500 } })
		editor.updateShape<HandleBoxShape>({ id: current, type: HANDLE_BOX, parentId: parent })
		editor.updateShape<HandleBoxShape>({ id: other, type: HANDLE_BOX, parentId: parent })

		// current is now at page (300, 300) and other at page (100, 100)
		const result = editor.snaps.handles.snapHandle({
			currentShapeId: current,
			handle: makeHandle(-95, -150),
		})

		expect(result?.nudge).toMatchObject({ x: -5, y: 0 })
		expect(getIndicatorPoints()).toEqual([[[200, 150]]])
	})

	it('treats the deprecated canSnap flag as point snapping', () => {
		const result = snapHandleAtPagePoint(105, 50, { canSnap: true })

		expect(result?.nudge).toMatchObject({ x: -5, y: 0 })
	})

	it('returns null for handles that do not snap', () => {
		expect(snapHandleAtPagePoint(105, 50, {})).toBeNull()
		expect(snapHandleAtPagePoint(105, 50, { canSnap: false })).toBeNull()
	})
})

describe('align snapping', () => {
	beforeEach(() => {
		updateProps(other, {
			handlePoints: [
				{ x: 100, y: 100 },
				{ x: 0, y: 0 },
			],
		})
	})

	it('aligns the handle with a snap point on one axis', () => {
		// x is 3 from the (100, 100) point; y is far from both points
		const result = snapHandleAtPagePoint(103, 250, { snapType: 'align' })

		expect(result?.nudge).toMatchObject({ x: -3, y: 0 })
		expect(getIndicatorPoints()).toEqual([
			[
				[100, 100],
				[100, 250],
			],
		])
	})

	it('aligns with different points on each axis', () => {
		// x is 3 from (100, 100); y is 4 from (0, 0)
		const result = snapHandleAtPagePoint(103, 4, { snapType: 'align' })

		expect(result?.nudge).toMatchObject({ x: -3, y: -4 })
		expect(getIndicatorPoints()).toEqual([
			[
				[100, 100],
				[100, 0],
			],
			[
				[0, 0],
				[100, 0],
			],
		])
	})

	it('aligns on the y axis only', () => {
		const result = snapHandleAtPagePoint(250, 96, { snapType: 'align' })

		expect(result?.nudge).toMatchObject({ x: 0, y: 4 })
		expect(getIndicatorPoints()).toEqual([
			[
				[100, 100],
				[250, 100],
			],
		])
	})

	it('returns null when no snap point is aligned within the threshold', () => {
		expect(snapHandleAtPagePoint(150, 150, { snapType: 'align' })).toBeNull()
		expect(snapHandleAtPagePoint(109, 250, { snapType: 'align' })).toBeNull()
	})

	it('ignores shape outlines', () => {
		updateProps(other, { handlePoints: [] })

		expect(snapHandleAtPagePoint(105, 50, { snapType: 'align' })).toBeNull()
	})

	it('uses the self snap points of the current shape', () => {
		updateProps(other, { handlePoints: [] })
		updateProps(current, { selfSnap: true })

		// the self snap point is the center at (250, 250)
		const result = snapHandleAtPagePoint(253, 400, { snapType: 'align' })

		expect(result?.nudge).toMatchObject({ x: -3, y: 0 })
		expect(getIndicatorPoints()).toEqual([
			[
				[250, 250],
				[250, 400],
			],
		])
	})

	it('scales the threshold with the zoom level', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })

		expect(snapHandleAtPagePoint(105, 250, { snapType: 'align' })).toBeNull()
		expect(snapHandleAtPagePoint(103, 250, { snapType: 'align' })?.nudge).toMatchObject({
			x: -3,
			y: 0,
		})
	})
})
