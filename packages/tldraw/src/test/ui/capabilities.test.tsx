import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const id = createShapeId('a')

describe('the default actions ask capabilities', () => {
	function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
		const actions = useActions()
		useEffect(() => onCapture(actions), [actions, onCapture])
		return null
	}

	it('disables delete, duplicate and align by capability', async () => {
		let actions: TLUiActionsContextType = {}
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<ActionCapturer
						onCapture={(a) => {
							actions = a
						}}
					/>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		const other = createShapeId('b')
		act(() => {
			editor.createShapes([
				{ id, type: 'geo', x: 0, y: 0 },
				{ id: other, type: 'geo', x: 200, y: 0 },
			])
			editor.select(id, other)
		})
		const isEnabled = (actionId: string) => actions[actionId].isEnabled!(editor)
		expect([isEnabled('delete'), isEnabled('duplicate'), isEnabled('align-left')]).toEqual([
			true,
			true,
			true,
		])

		editor.registerCapabilityCheck('delete-shape', () => false)
		editor.registerCapabilityCheck('create-shape', () => false)
		editor.registerCapabilityCheck('edit-shape', () => false)
		expect([isEnabled('delete'), isEnabled('duplicate'), isEnabled('align-left')]).toEqual([
			false,
			false,
			false,
		])
	})
})
