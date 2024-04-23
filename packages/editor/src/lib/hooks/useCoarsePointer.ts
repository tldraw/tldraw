import { useEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useCoarsePointer() {
	const editor = useEditor()
	useEffect(() => {
		// This is a workaround for a Firefox bug where we don't correctly
		// detect coarse VS fine pointer. For now, let's assume that you have a fine
		// pointer if you're on Firefox on desktop.
		if (
			editor.environment.isFirefox &&
			!editor.environment.isAndroid &&
			!editor.environment.isIos
		) {
			editor.updateInstanceState({ isCoarsePointer: false })
			return
		}
		if (window.matchMedia) {
			const mql = window.matchMedia('(any-pointer: coarse)')

			const handler = (coarse?: boolean) => {
				editor.updateInstanceState({ isCoarsePointer: coarse ?? !!mql.matches })```

			}

			const touchStartHandler = () => handler(true)
			const mouseMoveHandler = () => handler(false)

			handler()
			if (mql) {
				mql.addEventListener('change', () => handler())
				window.addEventListener('touchstart', touchStartHandler)
				window.addEventListener('mousemove', mouseMoveHandler)
				return () => {
					mql.removeEventListener('change', () => handler())
					window.removeEventListener('touchstart', touchStartHandler)
					window.removeEventListener('mousemove', mouseMoveHandler)
				}
			}
		}
	}, [editor])
}
