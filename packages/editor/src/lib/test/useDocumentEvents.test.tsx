import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import { createTLStore } from '../config/createTLStore'
import { TldrawEditor } from '../TldrawEditor'

describe('useDocumentEvents drop handling', () => {
	// The container's native drop listener used to stop propagation before the event reached
	// React's root, so React onDrop handlers inside the canvas never fired.
	it('lets a drop inside the canvas reach React drop handlers there', async () => {
		const onDrop = vi.fn((e: React.DragEvent) => e.stopPropagation())
		function DropTarget() {
			return <div data-testid="drop-target" onDrop={onDrop} />
		}
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} components={{ OnTheCanvas: DropTarget }} />)
		})

		const target = document.querySelector('[data-testid="drop-target"]')!
		expect(target.closest('.tl-canvas')).not.toBeNull()
		const event = new Event('drop', { bubbles: true, cancelable: true })
		Object.defineProperty(event, 'dataTransfer', { value: { files: [], getData: () => '' } })
		act(() => {
			target.dispatchEvent(event)
		})

		expect(onDrop).toHaveBeenCalledTimes(1)
		// the browser default (navigating to the dropped file) is still prevented
		expect(event.defaultPrevented).toBe(true)
	})
})
