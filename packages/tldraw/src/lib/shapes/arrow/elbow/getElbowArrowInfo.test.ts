import { createShapeId, TLArrowShape } from '@tldraw/editor'
import { TestEditor } from '../../../../test/TestEditor'
import { createOrUpdateArrowBinding, getArrowBindings } from '../shared'
import { getElbowArrowInfo } from './getElbowArrowInfo'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	arrow1: createShapeId('arrow1'),
}

beforeEach(() => {
	editor = new TestEditor()
})

describe('Elbow arrow with scale', () => {
	it.each([1, 5, 10, 20])('creates valid orthogonal routes with scale=%i', (scale) => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 250, y: 100, props: { w: 100, h: 100 } },
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 0,
				y: 0,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
					kind: 'elbow',
					scale,
					size: 's',
				},
			},
		])

		createOrUpdateArrowBinding(editor, ids.arrow1, ids.box1, {
			terminal: 'start',
			isExact: false,
			isPrecise: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
			snap: 'none',
		})

		createOrUpdateArrowBinding(editor, ids.arrow1, ids.box2, {
			terminal: 'end',
			isExact: false,
			isPrecise: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
			snap: 'none',
		})

		const arrow = editor.getShape(ids.arrow1)! as TLArrowShape
		const bindings = getArrowBindings(editor, arrow)
		const info = getElbowArrowInfo(editor, arrow, bindings)

		expect(info).toBeDefined()
		expect(arrow.props.kind).toBe('elbow')
		expect(info.route).toBeDefined()
		expect(info.route!.points.length).toBeGreaterThanOrEqual(3)

		// No duplicate consecutive points
		for (let i = 0; i < info.route!.points.length - 1; i++) {
			const p1 = info.route!.points[i]
			const p2 = info.route!.points[i + 1]
			const isDuplicate = Math.abs(p1.x - p2.x) < 0.01 && Math.abs(p1.y - p2.y) < 0.01
			expect(isDuplicate).toBe(false)
		}

		// All segments orthogonal
		for (let i = 0; i < info.route!.points.length - 1; i++) {
			const p1 = info.route!.points[i]
			const p2 = info.route!.points[i + 1]
			const isHorizontal = Math.abs(p1.y - p2.y) < 0.01
			const isVertical = Math.abs(p1.x - p2.x) < 0.01
			expect(isHorizontal || isVertical).toBe(true)
		}
	})
})
