import { b64Vecs, TLPointerEventInfo } from '@tldraw/editor'
import { onDragFromToolbarToCreateShape } from '../lib/ui/hooks/useTools'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

function dragInfo(): TLPointerEventInfo {
	return {
		type: 'pointer',
		target: 'canvas',
		name: 'pointer_move',
		point: { x: 50, y: 50, z: 0.5 },
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		pointerId: 1,
		button: 0,
		isPen: false,
	}
}

describe('onDragFromToolbarToCreateShape', () => {
	it('masks the toolbar with the created shape type by default', () => {
		onDragFromToolbarToCreateShape(editor, dragInfo(), {
			createShape: (id) => editor.createShape({ id, type: 'geo' }),
		})

		// while dragging, the toolbar shows the dragged shape's tool as active
		expect(editor.getCurrentToolId()).toBe('geo')
	})

	it('masks the toolbar with toolId when the shape type differs from the source tool', () => {
		// reproduces #9221: dragging a `draw` shape out from the select tool should keep
		// the select tool highlighted, not the draw (pen) tool.
		onDragFromToolbarToCreateShape(editor, dragInfo(), {
			maskedToolId: 'select',
			createShape: (id) =>
				editor.createShape({
					id,
					type: 'draw',
					props: {
						segments: [
							{
								type: 'free',
								path: b64Vecs.encodePoints([
									{ x: 0, y: 0, z: 0.5 },
									{ x: 10, y: 10, z: 0.5 },
								]),
							},
						],
					},
				}),
		})

		expect(editor.getCurrentToolId()).toBe('select')
	})
})
