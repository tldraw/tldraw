import { Outlet } from 'react-router-dom'
import { useValue } from 'tldraw'
import { AppStateProvider, useApp } from '../hooks/useAppState'
import '../styles/tla.css'
import { TlaDialogsProvider } from './TlaDialogsProvider'

export function Component() {
	return (
		<AppStateProvider>
			<Inner />
		</AppStateProvider>
	)
}

function Inner() {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])

	return (
		<div
			className={`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			<TlaDialogsProvider>
				<Outlet />
			</TlaDialogsProvider>
		</div>
	)
}
