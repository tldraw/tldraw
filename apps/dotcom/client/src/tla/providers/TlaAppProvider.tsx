import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
	AssetUrlsProvider,
	ContainerProvider,
	Dialogs,
	DialogsProvider,
	TLUiEventHandler,
	TranslationProvider,
	UiEventsProvider,
	useValue,
} from 'tldraw'
import { AppStateProvider, useApp } from '../hooks/useAppState'
import '../styles/tla.css'

export const assetUrls = getAssetUrlsByImport()

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
			<UiEventsProvider onEvent={handleAppLevelUiEvent}>
				<TranslationProvider locale="en">
					<DialogsProvider>
						<Outlet />
						<Dialogs />
					</DialogsProvider>
				</TranslationProvider>
			</UiEventsProvider>
		</AssetUrlsProvider>
	)
}
