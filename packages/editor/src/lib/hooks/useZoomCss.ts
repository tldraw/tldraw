import { EffectScheduler } from '@tldraw/state'
import * as React from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useZoomCss() {
	const editor = useEditor()
	const container = useContainer()

	React.useEffect(() => {
		const setScale = (s: number) => container.style.setProperty('--tl-zoom', s.toString())

		const scheduler = new EffectScheduler('useZoomCss', () =>
			setScale(editor.getEfficientZoomLevel())
		)

		scheduler.attach()
		scheduler.execute()

		return () => {
			scheduler.detach()
		}
	}, [editor, container])
}
