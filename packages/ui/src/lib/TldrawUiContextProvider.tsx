import { RecursivePartial } from '@tldraw/utils'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from './assetUrls'
import { ActionsProvider } from './hooks/useActions'
import { ActionsMenuSchemaProvider } from './hooks/useActionsMenuSchema'
import { AssetUrlsProvider } from './hooks/useAssetUrls'
import { BreakPointProvider } from './hooks/useBreakpoint'
import { TLUiContextMenuSchemaProvider } from './hooks/useContextMenuSchema'
import { DialogsProvider } from './hooks/useDialogsProvider'
import { EventsProvider, TLUiEventHandler } from './hooks/useEventsProvider'
import { HelpMenuSchemaProvider } from './hooks/useHelpMenuSchema'
import { KeyboardShortcutsSchemaProvider } from './hooks/useKeyboardShortcutsSchema'
import { TLUiMenuSchemaProvider } from './hooks/useMenuSchema'
import { ToastsProvider } from './hooks/useToastsProvider'
import { ToolbarSchemaProvider } from './hooks/useToolbarSchema'
import { ToolsProvider } from './hooks/useTools'
import { TranslationProvider } from './hooks/useTranslation/useTranslation'
import { TLUiOverrides, useMergedOverrides, useMergedTranslationOverrides } from './overrides'

/** @public */
export interface TldrawUiContextProviderProps {
	assetUrls?: RecursivePartial<TLUiAssetUrls>
	overrides?: TLUiOverrides | TLUiOverrides[]
	onUiEvent?: TLUiEventHandler
	children?: any
}

/** @public */
export function TldrawUiContextProvider({
	overrides,
	assetUrls,
	onUiEvent,
	children,
}: TldrawUiContextProviderProps) {
	return (
		<AssetUrlsProvider assetUrls={useDefaultUiAssetUrlsWithOverrides(assetUrls)}>
			<TranslationProvider overrides={useMergedTranslationOverrides(overrides)}>
				<EventsProvider onEvent={onUiEvent}>
					<ToastsProvider>
						<DialogsProvider>
							<BreakPointProvider>
								<InternalProviders overrides={overrides}>{children}</InternalProviders>
							</BreakPointProvider>
						</DialogsProvider>
					</ToastsProvider>
				</EventsProvider>
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
