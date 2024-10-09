import { useAuth } from '@clerk/clerk-react'
import { useCallback, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import {
	AssetUrlsProvider,
	ContainerProvider,
	TLUiEventHandler,
	TldrawUiDialogs,
	TldrawUiDialogsProvider,
	TldrawUiEventsProvider,
	TldrawUiToasts,
	TldrawUiToastsProvider,
	TldrawUiTranslationProvider,
	useValue,
} from 'tldraw'
import { AppStateProvider, useApp } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { assetUrls } from './TlaClerkProvider'

export function Component() {
	const auth = useAuth()

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		// todo: different routes should implement redirects; for example, shared files need to be accessible by from anon users
		return <Navigate to="local" replace />
	}

	return (
		<AppStateProvider>
			<UserProvider>
				<Inner />
			</UserProvider>
		</AppStateProvider>
	)
}

function Inner() {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const [container, setContainer] = useState<HTMLElement | null>(null)

	return (
		<div
			ref={setContainer}
			className={`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			{container && (
				<ContainerProvider container={container}>
					<InnerInner />
				</ContainerProvider>
			)}
		</div>
	)
}

function InnerInner() {
	const handleAppLevelUiEvent = useCallback<TLUiEventHandler>(() => {
		// todo, implement handling ui events at the application layer
	}, [])

	return (
		<AssetUrlsProvider assetUrls={assetUrls}>
			<TldrawUiEventsProvider onEvent={handleAppLevelUiEvent}>
				<TldrawUiTranslationProvider locale="en">
					<TldrawUiDialogsProvider>
						<TldrawUiToastsProvider>
							<Outlet />
							<TldrawUiDialogs />
							<TldrawUiToasts />
						</TldrawUiToastsProvider>
					</TldrawUiDialogsProvider>
				</TldrawUiTranslationProvider>
			</TldrawUiEventsProvider>
		</AssetUrlsProvider>
	)
}
