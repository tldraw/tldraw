import { useValue } from '@tldraw/state'
import React from 'react'
import { debugFlags } from '../utils/debug-flags'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useDarkMode() {
	const editor = useEditor()
	const container = useContainer()
	const isDarkMode = useValue('isDarkMode', () => editor.isDarkMode, [editor])
	const forceSrgb = useValue(debugFlags.forceSrgb)

	React.useEffect(() => {
		if (isDarkMode) {
			container.setAttribute('data-color-mode', 'dark')
			container.classList.remove('tl-theme__light')
			container.classList.add('tl-theme__dark')
			editor.setCursor({
				color: 'white',
			})
		} else {
			container.setAttribute('data-color-mode', 'light')
			container.classList.remove('tl-theme__dark')
			container.classList.add('tl-theme__light')
			editor.setCursor({
				color: 'black',
			})
		}
		if (forceSrgb) {
			container.classList.add('tl-theme__force-sRGB')
		} else {
			container.classList.remove('tl-theme__force-sRGB')
		}
	}, [editor, container, forceSrgb, isDarkMode])
}
