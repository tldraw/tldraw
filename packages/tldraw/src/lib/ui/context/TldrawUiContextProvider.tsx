import { RecursivePartial, defaultUserPreferences, track, useMaybeEditor } from '@tldraw/editor'
import { ReactNode } from 'react'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from '../assetUrls'
import { MimeTypeContext } from '../hooks/useInsertMedia'
import { ToolsProvider } from '../hooks/useTools'
import { TldrawUiTranslationProvider } from '../hooks/useTranslation/useTranslation'
import { TLUiOverrides, useMergedOverrides, useMergedTranslationOverrides } from '../overrides'
import { ActionsProvider } from './actions'
import { AssetUrlsProvider } from './asset-urls'
import { BreakPointProvider } from './breakpoints'
import { TLUiComponents, TldrawUiComponentsProvider } from './components'
import { TldrawUiDialogsProvider } from './dialogs'
import { TLUiEventHandler, TldrawUiEventsProvider } from './events'
import { TldrawUiToastsProvider } from './toasts'

/** @public */
export interface TLUiContextProviderProps {
	/**
	 * Urls for where to find fonts and other assets for the UI.
	 */
	assetUrls?: RecursivePartial<TLUiAssetUrls>

	/**
	 * Overrides for the UI.
	 */
	overrides?: TLUiOverrides | TLUiOverrides[]

	/**
	 * Overrides for the UI components.
	 */
	components?: TLUiComponents

	/**
	 * Callback for when an event occurs in the UI.
	 */
	onUiEvent?: TLUiEventHandler

	/**
	 * Whether to always should the mobile breakpoints.
	 */
	forceMobile?: boolean

	/**
	 * The component's children.
	 */
	children?: ReactNode

	/**
	 * Supported mime types for media files.
	 */
	mediaMimeTypes?: string[]
}

/** @public @react */
export const TldrawUiContextProvider = track(function TldrawUiContextProvider({
	overrides,
	components,
	assetUrls,
	onUiEvent,
	forceMobile,
	mediaMimeTypes,
	children,
}: TLUiContextProviderProps) {
	// To allow mounting the sidebar without an editor running, we use a 'maybe' editor here
	// The sidebar makes use of toasts and dialogs etc, which typically require an editor to be present
	// but we are overriding the providers to allow them to be used without an editor.
	const editor = useMaybeEditor()
	return (
		<MimeTypeContext.Provider value={mediaMimeTypes}>
			<AssetUrlsProvider assetUrls={useDefaultUiAssetUrlsWithOverrides(assetUrls)}>
				<TldrawUiTranslationProvider
					overrides={useMergedTranslationOverrides(overrides)}
					locale={editor?.user.getLocale() ?? defaultUserPreferences.locale}
				>
					<TldrawUiEventsProvider onEvent={onUiEvent}>
						<TldrawUiToastsProvider>
							<TldrawUiDialogsProvider context={editor?.contextId}>
								<BreakPointProvider forceMobile={forceMobile}>
									<TldrawUiComponentsProvider overrides={components}>
										{editor ? (
											// the internal providers are only valid when an editor is present
											<InternalProviders overrides={overrides}>{children}</InternalProviders>
										) : (
											children
										)}
									</TldrawUiComponentsProvider>
								</BreakPointProvider>
							</TldrawUiDialogsProvider>
						</TldrawUiToastsProvider>
					</TldrawUiEventsProvider>
				</TldrawUiTranslationProvider>
			</AssetUrlsProvider>
		</MimeTypeContext.Provider>
	)
})

function InternalProviders({
	overrides,
	children,
}: Omit<TLUiContextProviderProps, 'assetBaseUrl'>) {
	const mergedOverrides = useMergedOverrides(overrides)
	return (
		<ActionsProvider overrides={mergedOverrides.actions}>
			<ToolsProvider overrides={mergedOverrides.tools}>{children}</ToolsProvider>
		</ActionsProvider>
	)
}
