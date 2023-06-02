import { debounce } from '@tldraw/utils'
import * as React from 'react'
import { EffectScheduler } from 'signia'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useZoomCss() {
	const app = useEditor()
	const container = useContainer()

	React.useEffect(() => {
		const setScale = (s: number) => container.style.setProperty('--tl-zoom', s.toString())
		const setScaleDebounced = debounce(setScale, 100)

		const scheduler = new EffectScheduler('useZoomCss', () => {
			const numShapes = app.shapeIds.size
			if (numShapes < 300) {
				setScale(app.zoomLevel)
			} else {
				setScaleDebounced(app.zoomLevel)
			}
		})

		scheduler.attach()
		scheduler.execute()

		return () => {
			scheduler.detach()
		}
	}, [app, container])
}
