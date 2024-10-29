import { useEffect } from 'react'
import { tlenv } from '../globals/environment'
import { useEditor } from './useEditor'

/** @internal */
export function useCoarsePointer() {
	const editor = useEditor()

	useEffect(() => {
		// We'll track our own state for the pointer type
		let isCoarse = editor.getInstanceState().isCoarsePointer

		// 1.
		// We'll use pointer events to detect coarse pointer.

		const handlePointerDown = (e: PointerEvent) => {
			// when the user interacts with a mouse, we assume they have a fine pointer.
			// otherwise, we assume they have a coarse pointer.
			const isCoarseEvent = e.pointerType !== 'mouse'
			if (isCoarse === isCoarseEvent) return
			isCoarse = isCoarseEvent
			editor.updateInstanceState({ isCoarsePointer: isCoarseEvent })
		}

		// we need `capture: true` here because the tldraw component itself stops propagation on
		// pointer events it receives.
		window.addEventListener('pointerdown', handlePointerDown, { capture: true })

		// 2.
		// We can also use the media query to detect / set the initial pointer type
		// and update the state if the pointer type changes.

		// We want the touch / mouse events to run even if the browser does not
		// support matchMedia. We'll have to handle the media query changes
		// conditionally in the code below.
		const mql = window.matchMedia && window.matchMedia('(any-pointer: coarse)')

		// This is a workaround for a Firefox bug where we don't correctly
		// detect coarse VS fine pointer. For now, let's assume that you have a fine
		// pointer if you're on Firefox on desktop.
		const isForcedFinePointer = tlenv.isFirefox && !tlenv.isAndroid && !tlenv.isIos

		const handleMediaQueryChange = () => {
			const next = isForcedFinePointer ? false : mql.matches // get the value from the media query
			if (isCoarse !== next) return // bail if the value hasn't changed
			isCoarse = next // update the local value
			editor.updateInstanceState({ isCoarsePointer: next }) // update the value in state
		}

		if (mql) {
			// set up the listener
			mql.addEventListener('change', handleMediaQueryChange)

			// and run the handler once to set the initial value
			handleMediaQueryChange()
		}

		return () => {
			window.removeEventListener('pointerdown', handlePointerDown, { capture: true })

			if (mql) {
				mql.removeEventListener('change', handleMediaQueryChange)
			}
		}
	}, [editor])
}
