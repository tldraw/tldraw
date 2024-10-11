import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { TldrawAppUserRecordType } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
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
import 'tldraw/tldraw.css'
import { AppStateProvider } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { getLocalSessionState, updateLocalSessionState } from '../utils/local-session-state'

export const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

export function Component() {
	const handleAppLevelUiEvent = useCallback<TLUiEventHandler>(() => {
		// todo, implement handling ui events at the application layer
	}, [])

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<AppStateOrNotProvider>
				<TlaContainerProvider>
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
				</TlaContainerProvider>
			</AppStateOrNotProvider>
		</ClerkProvider>
	)
}

function AppStateOrNotProvider({ children }: { children: ReactNode }) {
	const auth = useAuth()

	useEffect(() => {
		if (auth.isSignedIn && auth.userId) {
			updateLocalSessionState(() => ({
				auth: { userId: TldrawAppUserRecordType.createId(auth.userId) },
			}))
		} else {
			updateLocalSessionState(() => ({
				auth: undefined,
			}))
		}
	}, [auth.userId, auth.isSignedIn])

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		return children
	}

	return (
		<AppStateProvider>
			<UserProvider>{children}</UserProvider>
		</AppStateProvider>
	)
}

function TlaContainerProvider({ children }: { children: ReactNode }) {
	const [container, setContainer] = useState<HTMLElement | null>(null)

	const theme = useValue('theme', () => getLocalSessionState().theme, [])

	return (
		<div ref={setContainer} className={`tla tl-container tla-theme__${theme}`}>
			{container && <ContainerProvider container={container}>{children}</ContainerProvider>}
		</div>
	)
}
