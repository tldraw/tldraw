import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { useMenuClipboardEvents } from '../../lib/ui/hooks/useClipboardEvents'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

type ClipboardHelpers = ReturnType<typeof useMenuClipboardEvents>

function ClipboardHelpersCapturer({ onCapture }: { onCapture(helpers: ClipboardHelpers): void }) {
	const helpers = useMenuClipboardEvents()
	useEffect(() => {
		onCapture(helpers)
	}, [helpers, onCapture])
	return null
}

async function setup() {
	let helpers: ClipboardHelpers | null = null
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ClipboardHelpersCapturer onCapture={(h) => (helpers = h)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	return { editor, cut: helpers!.cut }
}

describe('cut', () => {
	it('marks a history stopping point so undo does not roll back earlier changes', async () => {
		const { editor, cut } = await setup()
		const id = createShapeId('box')

		act(() => {
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })
			editor.markHistoryStoppingPoint('rename page')
			editor.renamePage(editor.getCurrentPageId(), 'My page')
			editor.select(id)
		})

		await act(async () => {
			await cut('menu')
		})
		expect(editor.getShape(id)).toBeUndefined()

		act(() => {
			editor.undo()
		})

		// the cut is undone, but the page rename before it is not
		expect(editor.getShape(id)).toBeDefined()
		expect(editor.getCurrentPage().name).toBe('My page')
	})
})
