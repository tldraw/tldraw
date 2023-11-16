import { EffectScheduler } from '@tldraw/state'
import { debounce } from '@tldraw/utils'
import * as React from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useZoomCss() {
	const editor = useEditor()
	const container = useContainer()

	React.useEffect(() => {
		const setScale = (s: number) => container.style.setProperty('--tl-zoom', s.toString())
		const setScaleDebounced = debounce(setScale, 100)

		const scheduler = new EffectScheduler('useZoomCss', () => {
			const numShapes = editor.getCurrentPageShapeIds().size
			if (numShapes < 300) {
				setScale(editor.getZoomLevel())
			} else {
				setScaleDebounced(editor.getZoomLevel())
			}
		})

		scheduler.attach()
		scheduler.execute()

		return () => {
			scheduler.detach()
		}
	}, [editor, container])
}
