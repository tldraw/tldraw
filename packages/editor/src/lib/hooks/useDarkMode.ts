import React from 'react'
import { useValue } from 'signia-react'
import { useApp } from './useApp'
import { useContainer } from './useContainer'

export function useDarkMode() {
	const app = useApp()
	const container = useContainer()
	const isDarkMode = useValue('isDarkMode', () => app.isDarkMode, [app])

	React.useEffect(() => {
		if (isDarkMode) {
			container.setAttribute('data-color-mode', 'dark')
			container.classList.remove('tl-theme__light')
			container.classList.add('tl-theme__dark')
			app.setCursor({
				color: 'white',
			})
		} else {
			container.setAttribute('data-color-mode', 'light')
			container.classList.remove('tl-theme__dark')
			container.classList.add('tl-theme__light')
			app.setCursor({
				color: 'black',
			})
		}
	}, [app, container, isDarkMode])
}
