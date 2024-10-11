import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { ReactNode, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
	ContainerProvider,
	EditorContext,
	TLUiEventHandler,
	TldrawUiContextProvider,
	TldrawUiDialogs,
	TldrawUiToasts,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { components } from '../components/TlaEditor/TlaEditor'
import { AppStateProvider, useApp } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'

const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	const [container, setContainer] = useState<HTMLElement | null>(null)

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<div ref={setContainer} className={`tla tl-container`}>
				{container && (
					<ContainerProvider container={container}>
						<InsideOfContainerContext>
							<SignedInProvider />
						</InsideOfContainerContext>
					</ContainerProvider>
				)}
			</div>
		</ClerkProvider>
	)
}

function InsideOfContainerContext({ children }: { children: ReactNode }) {
	const handleAppLevelUiEvent = useCallback<TLUiEventHandler>(() => {
		// todo, implement handling ui events at the application layer
	}, [])
	const currentEditor = useValue('editor', () => globalEditor.get(), [])
	const FakeProvider = ({ children }: { children: ReactNode }) => children
	const MaybeEditorProvider = currentEditor ? EditorContext.Provider : FakeProvider
	const MaybeUiContextProvider = currentEditor ? TldrawUiContextProvider : FakeProvider

	return (
		<MaybeEditorProvider value={currentEditor}>
			<MaybeUiContextProvider
				assetUrls={assetUrls}
				components={components}
				onUiEvent={handleAppLevelUiEvent}
			>
				{children}
				{currentEditor && <TldrawUiDialogs />}
				{currentEditor && <TldrawUiToasts />}
			</MaybeUiContextProvider>
		</MaybeEditorProvider>
	)
}

function SignedInProvider() {
	const auth = useAuth()

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		return <Outlet />
	}

	return (
		<AppStateProvider>
			<UserProvider>
				<ThemeContainer>
					<Outlet />
				</ThemeContainer>
			</UserProvider>
		</AppStateProvider>
	)
}

function ThemeContainer({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app?.getSessionState().theme ?? 'light', [app])
	return (
		<div
			className={`tla-theme-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			{children}
		</div>
	)
}
