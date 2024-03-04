import { RecursivePartial } from '@tldraw/editor'
import { ReactNode } from 'react'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from '../assetUrls'
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

/**
 * Props for the {@link tldraw#Tldraw} and {@link TldrawUi} components.
 *
 * @public
 **/
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
}

/** @public */
export function TldrawUiContextProvider({
	overrides,
	components,
	assetUrls,
	onUiEvent,
	forceMobile,
	children,
}: TldrawUiContextProviderProps) {
	return (
		<AssetUrlsProvider assetUrls={useDefaultUiAssetUrlsWithOverrides(assetUrls)}>
			<TranslationProvider overrides={useMergedTranslationOverrides(overrides)}>
				<UiEventsProvider onEvent={onUiEvent}>
					<ToastsProvider>
						<DialogsProvider>
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
