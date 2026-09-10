import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
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

async function setup() {
	let actions: TLUiActionsContextType | null = null
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ActionCapturer onCapture={(a) => (actions = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	return { editor, unlockAll: actions!['unlock-all'] }
}

describe('unlock-all action', () => {
	it('marks a history stopping point so undo does not roll back earlier changes', async () => {
		const { editor, unlockAll } = await setup()

		const lockedId = createShapeId()
		const laterId = createShapeId()
		act(() => {
			editor.markHistoryStoppingPoint('create locked')
			editor.createShape({ id: lockedId, type: 'geo', x: 0, y: 0, isLocked: true })
			editor.markHistoryStoppingPoint('create later')
			editor.createShape({ id: laterId, type: 'geo', x: 200, y: 0 })
		})

		act(() => {
			unlockAll.onSelect('context-menu')
		})
		expect(editor.getShape(lockedId)!.isLocked).toBe(false)

		act(() => {
			editor.undo()
		})

		// the unlock is undone, but the shape created before it survives
		expect(editor.getShape(lockedId)!.isLocked).toBe(true)
		expect(editor.getShape(laterId)).toBeDefined()
	})
})
