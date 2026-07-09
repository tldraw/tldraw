import { RecursivePartial, defaultUserPreferences, track, useMaybeEditor } from '@tldraw/editor'
import {
	TldrawUiBreakpointProvider,
	TldrawUiIconProvider,
	TldrawUiMenuStateProvider,
	TldrawUiPlatformProvider,
	TldrawUiPortalProvider,
	TldrawUiTooltipProvider,
	TldrawUiTranslationProvider as TldrawUiPrimitiveTranslationProvider,
} from '@tldraw/ui'
import { ReactNode, useCallback } from 'react'
import { TLUiAssetUrls, useDefaultUiAssetUrlsWithOverrides } from '../assetUrls'
import { useMenuIsOpen } from '../hooks/useMenuIsOpen'
import { ToolsProvider } from '../hooks/useTools'
import {
	TldrawUiTranslationProvider,
	useDirection,
	useTranslation,
} from '../hooks/useTranslation/useTranslation'
import {
	MimeTypeContext,
	TLUiOverrides,
	useMergedOverrides,
	useMergedTranslationOverrides,
} from '../overrides'
import { TldrawUiA11yProvider } from './a11y'
import { ActionsProvider } from './actions'
import { AssetUrlsProvider, useAssetUrls } from './asset-urls'
import { BreakPointProvider } from './breakpoints'
import { useBreakpoint } from './breakpoints'
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
							<TldrawUiDialogsProvider context={'tla'}>
								<TldrawUiA11yProvider>
									<BreakPointProvider forceMobile={forceMobile}>
										<TldrawUiSharedProvider>
											<TldrawUiComponentsProvider overrides={components}>
												<InternalProviders overrides={overrides}>{children}</InternalProviders>
											</TldrawUiComponentsProvider>
										</TldrawUiSharedProvider>
									</BreakPointProvider>
								</TldrawUiA11yProvider>
							</TldrawUiDialogsProvider>
						</TldrawUiToastsProvider>
					</TldrawUiEventsProvider>
				</TldrawUiTranslationProvider>
			</AssetUrlsProvider>
		</MimeTypeContext.Provider>
	)
})

function TldrawUiSharedProvider({ children }: { children: ReactNode }) {
	const editor = useMaybeEditor()
	const assetUrls = useAssetUrls()
	const breakpoint = useBreakpoint()
	const dir = useDirection()
	const tldrawMsg = useTranslation()

	const msg = useCallback(
		(key: string) => {
			const value = tldrawMsg(key)
			return value === key ? undefined : value
		},
		[tldrawMsg]
	)

	const isMoving = useCallback(() => editor?.getCameraState() === 'moving', [editor])

	return (
		<TldrawUiPrimitiveTranslationProvider dir={dir} msg={msg}>
			<TldrawUiPlatformProvider>
				<TldrawUiPortalProvider container={editor?.getContainer() ?? null}>
					<TldrawUiIconProvider assetUrls={assetUrls.icons}>
						<TldrawUiMenuStateProvider useMenuIsOpen={useMenuIsOpen}>
							<TldrawUiBreakpointProvider breakpoint={breakpoint}>
								<TldrawUiTooltipProvider isMoving={isMoving}>{children}</TldrawUiTooltipProvider>
							</TldrawUiBreakpointProvider>
						</TldrawUiMenuStateProvider>
					</TldrawUiIconProvider>
				</TldrawUiPortalProvider>
			</TldrawUiPlatformProvider>
		</TldrawUiPrimitiveTranslationProvider>
	)
}

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
