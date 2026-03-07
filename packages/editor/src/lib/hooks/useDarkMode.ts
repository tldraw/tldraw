import { useValue } from '@tldraw/state-react'
import React from 'react'
import { debugFlags } from '../utils/debug-flags'
import { useContainer } from './useContainer'
import { useCurrentThemeId } from './useCurrentThemeId'
import { useEditor } from './useEditor'

export function useDarkMode() {
	const editor = useEditor()
	const container = useContainer()
	const themeId = useCurrentThemeId()
	const forceSrgb = useValue(debugFlags.forceSrgb)

	React.useEffect(() => {
		if (themeId === 'dark') {
			container.setAttribute('data-color-mode', 'dark')
			container.classList.remove('tl-theme__light')
			container.classList.add('tl-theme__dark')
		} else {
			container.setAttribute('data-color-mode', 'light')
			container.classList.remove('tl-theme__dark')
			container.classList.add('tl-theme__light')
		}
		if (forceSrgb) {
			container.classList.add('tl-theme__force-sRGB')
		} else {
			container.classList.remove('tl-theme__force-sRGB')
		}
	}, [editor, container, forceSrgb, themeId])
}
