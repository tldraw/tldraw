import { act, cleanup, render } from '@testing-library/react'
import { useRef, useState } from 'react'
import { createTLStore } from '../config/createTLStore'
import { usePassThroughWheelEvents } from '../hooks/usePassThroughWheelEvents'
import { TL_CONTAINER_CLASS, TldrawEditor } from '../TldrawEditor'

let setVisible: (visible: boolean) => void
let rerender: () => void

/**
 * The shape a comment pin has: the hook's owner stays mounted while the element the ref points at
 * is culled and later remounted (the pin returns null when its anchor leaves the viewport).
 */
function Culled() {
	const ref = useRef<HTMLButtonElement>(null)
	usePassThroughWheelEvents(ref)
	const [visible, _setVisible] = useState(true)
	const [, setTick] = useState(0)
	setVisible = _setVisible
	rerender = () => setTick((t) => t + 1)
	if (!visible) return null
	return <button ref={ref} data-testid="marker" />
}

describe('usePassThroughWheelEvents', () => {
	async function renderEditor() {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} components={{ InFrontOfTheCanvas: Culled }} />)
		})
		return document.querySelector(`.${TL_CONTAINER_CLASS}`)!
	}

	function wheelOverMarker(container: Element) {
		const canvas = container.querySelector('.tl-canvas')!
		const received: Event[] = []
		canvas.addEventListener('wheel', (e) => received.push(e))
		const marker = container.querySelector('[data-testid="marker"]')!
		marker.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 10 }))
		return received
	}

	it('redispatches wheel events over the element to the canvas', async () => {
		const container = await renderEditor()
		expect(wheelOverMarker(container)).toHaveLength(1)
	})

	// The regression: the owner stays mounted across the cull, so an effect keyed on its deps never
	// re-runs and the listener is left on the discarded element.
	it('still redispatches after the element unmounts and remounts', async () => {
		const container = await renderEditor()
		await act(async () => setVisible(false))
		await act(async () => setVisible(true))
		expect(wheelOverMarker(container)).toHaveLength(1)
	})

	// The re-attach check runs on every render, so it has to be a no-op when the element hasn't
	// changed — otherwise each render stacks another listener and one wheel redispatches many.
	it('does not stack listeners across renders that leave the element in place', async () => {
		const container = await renderEditor()
		for (let i = 0; i < 3; i++) {
			await act(async () => rerender())
		}
		expect(wheelOverMarker(container)).toHaveLength(1)
	})

	it('stops redispatching once the owner unmounts', async () => {
		const container = await renderEditor()
		const marker = container.querySelector('[data-testid="marker"]')!
		const canvas = container.querySelector('.tl-canvas')!
		const received: Event[] = []
		canvas.addEventListener('wheel', (e) => received.push(e))
		await act(async () => cleanup())
		marker.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 10 }))
		expect(received).toHaveLength(0)
	})
})
