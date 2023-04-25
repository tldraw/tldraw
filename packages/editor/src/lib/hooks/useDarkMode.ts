import React from 'react'
import { useValue } from 'signia-react'
import { useApp } from './useApp'
import { useContainer } from './useContainer'

export function useDarkMode() {
	const app = useApp()
	const container = useContainer()
	const isDarkMode = useValue('isDarkMode', () => app.userDocumentSettings.isDarkMode, [app])

	React.useEffect(() => {
		if (isDarkMode) {
			container.setAttribute('data-color-mode', 'dark')
			container.classList.remove('rs-theme__light')
			container.classList.add('rs-theme__dark')
			app.setCursor({
				color: 'white',
			})
		} else {
			container.setAttribute('data-color-mode', 'light')
			container.classList.remove('rs-theme__dark')
			container.classList.add('rs-theme__light')
			app.setCursor({
				color: 'black',
			})
		}
	}, [app, container, isDarkMode])
}
