import { Group2d, IndexKey, TLShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { TL } from '../../../test/test-jsx'

let editor: TestEditor
let ids: Record<string, TLShapeId>

beforeEach(() => {
	editor = new TestEditor()
})

describe('Handle snapping', () => {
	beforeEach(() => {
		ids = editor.createShapesFromJsx(
			<>
				<TL.geo ref="geo" x={0} y={0} geo="rectangle" w={100} h={100} />
				<TL.line
					ref="line"
					x={0}
					y={0}
					points={{
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 200, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 200, y: 100 },
					}}
				/>
			</>
		)
	})

	const geoShape = () => editor.getShape(ids.geo)!
	const lineShape = () => editor.getShape(ids.line)!
	const lineHandles = () => editor.getShapeUtil('line').getHandles!(lineShape())!

	function startDraggingHandle() {
		editor
			.select(ids.line)
			.pointerDown(200, 0, { target: 'handle', shape: lineShape(), handle: lineHandles()[0] })
	}

	test('handles snap to the edges of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(50, 5, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 50, y: 0 })
	})

	test('handles snap to the corner of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(0, 5, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 0, y: 0 })
	})

	test('handles snap to the center of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(51, 45, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 50, y: 50 })
	})

	test('does not snap to the label of the shape', () => {
		startDraggingHandle()
		const geometry = editor.getShapeUtil('geo').getGeometry(geoShape()) as Group2d
		const label = geometry.children.find((c) => c.isLabel)!
		const labelVertex = label.vertices[0]
		editor.pointerMove(labelVertex.x + 2, labelVertex.y + 2, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(0)
		expect(lineHandles()[0]).toMatchObject({ x: labelVertex.x + 2, y: labelVertex.y + 2 })
	})
})
