import { debounce } from '@tldraw/utils'
import { useEffect } from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents() {
	const editor = useEditor()
	const container = useContainer()

	useEffect(() => {
		if (!container) return

		// We need to debounce this because when focus changes, the body
		// becomes focused for a brief moment. Debouncing means that we
		// check only when focus stops changing: when it settles, what
		// has it settled on? If it's settled on the container or something
		// inside of the container, then focus or preserve the current focus;
		// if not, then turn off focus. Turning off focus is a trigger to
		// also turn off keyboard shortcuts and other things.
		const updateFocus = debounce(() => {
			const { activeElement } = document
			const { isFocused: wasFocused } = editor.instanceState
			const isFocused =
				document.hasFocus() && (container === activeElement || container.contains(activeElement))

			if (wasFocused !== isFocused) {
				editor.updateInstanceState({ isFocused })
				editor.updateViewportScreenBounds()

				if (!isFocused) {
					// When losing focus, run complete() to ensure that any interacts end
					editor.complete()
				}
			}
		}, 32)

		container.addEventListener('focusin', updateFocus)
		container.addEventListener('focus', updateFocus)
		container.addEventListener('focusout', updateFocus)
		container.addEventListener('blur', updateFocus)

		return () => {
			container.removeEventListener('focusin', updateFocus)
			container.removeEventListener('focus', updateFocus)
			container.removeEventListener('focusout', updateFocus)
			container.removeEventListener('blur', updateFocus)
		}
	}, [container, editor])
}
