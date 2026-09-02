import { useEffect } from 'react'
import { elementShouldCaptureKeys, preventDefault } from '../utils/dom'
import { useEditor } from './useEditor'

/**
 * When double tapping with the pencil in iOS, it enables a little zoom window in the UI. We don't
 * want this for drawing operations and can disable it by setting 'disableDoubleTapZoom' in the main
 * editor.
 */
export function useFixSafariDoubleTapZoomPencilEvents(ref: React.RefObject<HTMLElement | null>) {
	const editor = useEditor()

	useEffect(() => {
		const elm = ref.current

		if (!elm) return

		const win = editor.getContainerWindow()
		const handleEvent = (e: PointerEvent | TouchEvent) => {
			if (e instanceof win.PointerEvent && e.pointerType === 'pen') {
				editor.markEventAsHandled(e)
				const { target } = e

				if (
					elementShouldCaptureKeys(target instanceof win.Element ? target : null, false) ||
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
