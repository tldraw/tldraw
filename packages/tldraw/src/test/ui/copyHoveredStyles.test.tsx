import { DefaultColorStyle, createShapeId } from '@tldraw/editor'
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
})
