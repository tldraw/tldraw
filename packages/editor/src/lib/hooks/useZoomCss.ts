import { react } from '@tldraw/state'
import * as React from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useZoomCss() {
	const editor = useEditor()
	const container = useContainer()

	React.useEffect(() => {
		return react('useZoomCss', () => {
			container.style.setProperty('--tl-zoom', editor.getEfficientZoomLevel().toString())
		})
	}, [editor, container])
}
