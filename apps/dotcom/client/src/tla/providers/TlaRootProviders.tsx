import { ReactNode, useCallback, useState } from 'react'
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
} from 'tldraw'
import { assetUrls } from './TlaProvider'

export function TlaRootProviders({ children }: { children: ReactNode }) {
	const [container, setContainer] = useState<HTMLElement | null>(null)

	return (
		<div ref={setContainer} className={`tla tl-container`}>
			{container && (
				<ContainerProvider container={container}>
					<InsideOfContainerContext>{children}</InsideOfContainerContext>
				</ContainerProvider>
			)}
		</div>
	)
}

function InsideOfContainerContext({ children }: { children: ReactNode }) {
	const handleAppLevelUiEvent = useCallback<TLUiEventHandler>(() => {
		// todo, implement handling ui events at the application layer
	}, [])

	return (
		<AssetUrlsProvider assetUrls={assetUrls}>
			<TldrawUiEventsProvider onEvent={handleAppLevelUiEvent}>
				<TldrawUiTranslationProvider locale="en">
					<TldrawUiDialogsProvider>
						<TldrawUiToastsProvider>
							{children}
							<TldrawUiDialogs />
							<TldrawUiToasts />
						</TldrawUiToastsProvider>
					</TldrawUiDialogsProvider>
				</TldrawUiTranslationProvider>
			</TldrawUiEventsProvider>
		</AssetUrlsProvider>
	)
}
