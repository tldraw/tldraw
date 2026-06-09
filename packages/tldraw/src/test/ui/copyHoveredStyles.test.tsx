import { act } from '@testing-library/react'
import { Box, DefaultColorStyle, Editor, createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

// Move the pointer so the editor's current page point is over a given location. The
// copy-hovered-styles action hit-tests this point to drill into groups.
function movePointerTo(editor: Editor, x: number, y: number) {
	act(() => {
		editor.dispatch({
			type: 'pointer',
			target: 'canvas',
			name: 'pointer_move',
			point: { x, y },
			pointerId: 1,
			button: 0,
			isPen: false,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			accelKey: false,
		})
		editor.emit('tick', 16)
	})
}

describe('copy-hovered-styles action', () => {
	it('only copies styles from the main select idle state, not nested idles like crop', async () => {
		let actions: TLUiActionsContextType | null = null
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<ActionCapturer onCapture={(a) => (actions = a)} />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)

		const redId = createShapeId()
		editor.createShapes([
			{ id: redId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100, color: 'red' } },
		])

		const copyHoveredStyles = actions!['copy-hovered-styles']

		// From the main select idle state, hovering a red shape copies its color to the next shape.
		editor.setStyleForNextShapes(DefaultColorStyle, 'black')
		editor.setCurrentTool('select.idle')
		editor.setHoveredShape(redId)
		expect(editor.isIn('select.idle')).toBe(true)

		await copyHoveredStyles.onSelect('kbd')
		expect(editor.getStyleForNextShape(DefaultColorStyle)).toBe('red')

		// From a nested idle state (select.crop.idle) the action is a no-op, even though the leaf
		// state node's id is also 'idle'.
		editor.setStyleForNextShapes(DefaultColorStyle, 'blue')
		editor.setCurrentTool('select.crop.idle')
		editor.setHoveredShape(redId)
		expect(editor.isIn('select.crop.idle')).toBe(true)

		await copyHoveredStyles.onSelect('kbd')
		expect(editor.getStyleForNextShape(DefaultColorStyle)).toBe('blue')
	})

	it('copies styles from the child under the cursor when a group is hovered', async () => {
		let actions: TLUiActionsContextType | null = null
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<ActionCapturer onCapture={(a) => (actions = a)} />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)

		// The action hit-tests rendering shapes, so give the editor a real viewport.
		act(() => {
			editor.updateViewportScreenBounds(new Box(0, 0, 1000, 800))
		})

		const redId = createShapeId()
		const blueId = createShapeId()
		editor.createShapes([
			{
				id: redId,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, color: 'red', fill: 'solid' },
			},
			{
				id: blueId,
				type: 'geo',
				x: 200,
				y: 0,
				props: { w: 100, h: 100, color: 'blue', fill: 'solid' },
			},
		])
		editor.setSelectedShapes([redId, blueId])
		editor.groupShapes(editor.getSelectedShapeIds())
		const groupId = editor.getOnlySelectedShapeId()!
		expect(editor.isShapeOfType(editor.getShape(groupId)!, 'group')).toBe(true)
		editor.selectNone()

		const copyHoveredStyles = actions!['copy-hovered-styles']
		editor.setCurrentTool('select.idle')

		// Hovering the group highlights the whole group, but pointing at the red child should
		// copy red. We set the hovered shape to the group explicitly (matching what the editor
		// does when hovering a child of an unfocused group) and move the pointer over the child.
		editor.setStyleForNextShapes(DefaultColorStyle, 'black')
		movePointerTo(editor, 50, 50)
		editor.setHoveredShape(groupId)
		await copyHoveredStyles.onSelect('kbd')
		expect(editor.getStyleForNextShape(DefaultColorStyle)).toBe('red')

		// Pointing at the blue child should copy blue.
		editor.setStyleForNextShapes(DefaultColorStyle, 'black')
		movePointerTo(editor, 250, 50)
		editor.setHoveredShape(groupId)
		await copyHoveredStyles.onSelect('kbd')
		expect(editor.getStyleForNextShape(DefaultColorStyle)).toBe('blue')
	})
})
