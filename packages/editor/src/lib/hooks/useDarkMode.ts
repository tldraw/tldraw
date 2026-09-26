import { useValue } from '@tldraw/state-react'
import React from 'react'
import { debugFlags } from '../utils/debug-flags'
import { useColorMode } from './useColorMode'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useDarkMode() {
	const editor = useEditor()
	const container = useContainer()
	const colorMode = useColorMode()
	const forceSrgb = useValue(debugFlags.forceSrgb)

	React.useEffect(() => {
		const isDark = colorMode === 'dark'
		container.setAttribute('data-color-mode', colorMode)
		container.classList.toggle('tl-theme__dark', isDark)
		container.classList.toggle('tl-theme__light', !isDark)
		container.classList.toggle('tl-theme__force-sRGB', forceSrgb)
	}, [editor, container, forceSrgb, colorMode])
}
