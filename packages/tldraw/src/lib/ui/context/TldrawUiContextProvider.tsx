import { RecursivePartial, useEditor } from '@tldraw/editor'
import { ReactNode } from 'react'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from '../assetUrls'
import { MimeTypeContext } from '../hooks/useInsertMedia'
import { ToolsProvider } from '../hooks/useTools'
import { TranslationProvider } from '../hooks/useTranslation/useTranslation'
import { TLUiOverrides, useMergedOverrides, useMergedTranslationOverrides } from '../overrides'
import { ActionsProvider } from './actions'
import { AssetUrlsProvider } from './asset-urls'
import { BreakPointProvider } from './breakpoints'
import { TLUiComponents, TldrawUiComponentsProvider } from './components'
import { DialogsProvider } from './dialogs'
import { TLUiEventHandler, UiEventsProvider } from './events'
import { ToastsProvider } from './toasts'

/** @public */
export interface TldrawUiContextProviderProps {
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
export function TldrawUiContextProvider({
	overrides,
	components,
	assetUrls,
	onUiEvent,
	forceMobile,
	mediaMimeTypes,
	children,
}: TldrawUiContextProviderProps) {
	const editor = useEditor()
	return (
		<MimeTypeContext.Provider value={mediaMimeTypes}>
			<AssetUrlsProvider assetUrls={useDefaultUiAssetUrlsWithOverrides(assetUrls)}>
				<TranslationProvider
					overrides={useMergedTranslationOverrides(overrides)}
					locale={editor.user.getLocale()}
				>
					<UiEventsProvider onEvent={onUiEvent}>
						<ToastsProvider>
							<DialogsProvider context={editor.menuId}>
								<BreakPointProvider forceMobile={forceMobile}>
									<TldrawUiComponentsProvider overrides={components}>
										<InternalProviders overrides={overrides}>{children}</InternalProviders>
									</TldrawUiComponentsProvider>
								</BreakPointProvider>
							</DialogsProvider>
						</ToastsProvider>
					</UiEventsProvider>
				</TranslationProvider>
			</AssetUrlsProvider>
		</MimeTypeContext.Provider>
	)
}

function InternalProviders({
	overrides,
	children,
}: Omit<TldrawUiContextProviderProps, 'assetBaseUrl'>) {
	const mergedOverrides = useMergedOverrides(overrides)
	return (
		<ActionsProvider overrides={mergedOverrides.actions}>
			<ToolsProvider overrides={mergedOverrides.tools}>{children}</ToolsProvider>
		</ActionsProvider>
	)
}
