import { ClerkProvider } from '@clerk/clerk-react'
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
import { useMaybeApp } from '../hooks/useAppState'

const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	const app = useMaybeApp()
	const theme = useValue('theme', () => app?.getSessionState().theme ?? 'light', [app])
	const [container, setContainer] = useState<HTMLElement | null>(null)

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<div
				ref={setContainer}
				className={`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
			>
				{container && (
					<ContainerProvider container={container}>
						<InsideOfContainerContext>
							<Outlet />
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
