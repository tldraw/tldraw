import { useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useEditor } from './useEditor'

const IGNORED_TAGS = ['textarea', 'input']

/**
 * When double tapping with the pencil in iOS, it enables a little zoom window in the UI. We don't
 * want this for drawing operations and can disable it by setting 'disableDoubleTapZoom' in the main
 * editor.
 */
export function useFixSafariDoubleTapZoomPencilEvents(ref: React.RefObject<HTMLElement>) {
	const editor = useEditor()

	useEffect(() => {
		const elm = ref.current

		if (!elm) return

		const handleEvent = (e: PointerEvent | TouchEvent) => {
			if (e instanceof PointerEvent && e.pointerType === 'pen') {
				;(e as any).isKilled = true
				const { target } = e

				// Allow events to propagate if the app is editing a shape, or if the event is occurring in a text area or input
				if (
					IGNORED_TAGS.includes((target as Element).tagName?.toLocaleLowerCase()) ||
					editor.isIn('select.editing_shape')
				) {
					return
				}

				preventDefault(e)
			}
		}

		elm.addEventListener('touchstart', handleEvent)
		elm.addEventListener('touchend', handleEvent)
		return () => {
			elm.removeEventListener('touchstart', handleEvent)
			elm.removeEventListener('touchend', handleEvent)
		}
	}, [editor, ref])
}
