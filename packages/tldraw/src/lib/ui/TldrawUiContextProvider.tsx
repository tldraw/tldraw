import { RecursivePartial } from '@tldraw/editor'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from './assetUrls'
import { ActionsProvider } from './hooks/useActions'
import { ActionsMenuSchemaProvider } from './hooks/useActionsMenuSchema'
import { AssetUrlsProvider } from './hooks/useAssetUrls'
import { BreakPointProvider } from './hooks/useBreakpoint'
import { TLUiContextMenuSchemaProvider } from './hooks/useContextMenuSchema'
import { DialogsProvider } from './hooks/useDialogsProvider'
import { TLUiEventHandler, UiEventsProvider } from './hooks/useEventsProvider'
import { HelpMenuSchemaProvider } from './hooks/useHelpMenuSchema'
import { KeyboardShortcutsSchemaProvider } from './hooks/useKeyboardShortcutsSchema'
import { TLUiMenuSchemaProvider } from './hooks/useMenuSchema'
import { ToastsProvider } from './hooks/useToastsProvider'
import { ToolbarSchemaProvider } from './hooks/useToolbarSchema'
import { ToolsProvider } from './hooks/useTools'
import { TranslationProvider } from './hooks/useTranslation/useTranslation'
import { TLUiOverrides, useMergedOverrides, useMergedTranslationOverrides } from './overrides'

/**
 * Props for the {@link @tldraw/tldraw#Tldraw} and {@link TldrawUi} components.
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
	children?: any
}

/** @public */
export function TldrawUiContextProvider({
	overrides,
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
								<InternalProviders overrides={overrides}>{children}</InternalProviders>
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
			<ToolsProvider overrides={mergedOverrides.tools}>
				<ToolbarSchemaProvider overrides={mergedOverrides.toolbar}>
					<ActionsMenuSchemaProvider overrides={mergedOverrides.actionsMenu}>
						<KeyboardShortcutsSchemaProvider overrides={mergedOverrides.keyboardShortcutsMenu}>
							<TLUiContextMenuSchemaProvider overrides={mergedOverrides.contextMenu}>
								<HelpMenuSchemaProvider overrides={mergedOverrides.helpMenu}>
									<TLUiMenuSchemaProvider overrides={mergedOverrides.menu}>
										{children}
									</TLUiMenuSchemaProvider>
								</HelpMenuSchemaProvider>
							</TLUiContextMenuSchemaProvider>
						</KeyboardShortcutsSchemaProvider>
					</ActionsMenuSchemaProvider>
				</ToolbarSchemaProvider>
			</ToolsProvider>
		</ActionsProvider>
	)
}
