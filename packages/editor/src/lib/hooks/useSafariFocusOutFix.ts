import * as React from 'react'
import { useEditor } from './useEditor'

let isMobileSafari = false

if (typeof window !== 'undefined') {
	const ua = window.navigator.userAgent
	const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
	const webkit = !!ua.match(/WebKit/i)
	isMobileSafari = iOS && webkit && !ua.match(/CriOS/i)
}

export function useSafariFocusOutFix(): void {
	const editor = useEditor()

	React.useEffect(() => {
		if (!isMobileSafari) return

		function handleFocusOut(e: FocusEvent) {
			if (
				(e.target instanceof HTMLInputElement && e.target.type === 'text') ||
				e.target instanceof HTMLTextAreaElement
			) {
				editor.complete()
			}
		}

		// Send event on iOS when a user presses the "Done" key while editing a text element.
		document.addEventListener('focusout', handleFocusOut)
		return () => document.removeEventListener('focusout', handleFocusOut)
	}, [editor])
}
