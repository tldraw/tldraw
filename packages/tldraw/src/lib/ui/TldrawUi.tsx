import React, { ReactNode } from 'react'
import { TLUiAssetUrlOverrides } from './assetUrls'
import {
	TLUiContextProviderProps,
	TldrawUiContextProvider,
} from './context/TldrawUiContextProvider'
import { TLUiComponents, useTldrawUiComponents } from './context/components'
import { useNativeClipboardEvents } from './hooks/useClipboardEvents'
import { useEditorEvents } from './hooks/useEditorEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

/** @public */
export interface TldrawUiProps extends TLUiContextProviderProps {
	/**
	 * The component's children.
	 */
	children?: ReactNode

	/**
	 * Whether to hide the user interface and only display the canvas.
	 */
	hideUi?: boolean

	/**
	 * Overrides for the UI components.
	 */
	components?: TLUiComponents

	/**
	 * Additional items to add to the debug menu (will be deprecated)
	 */
	renderDebugMenuItems?(): React.ReactNode

	/** Asset URL override. */
	assetUrls?: TLUiAssetUrlOverrides
}

/**
 * @public
 * @react
 */
export const TldrawUi = React.memo(function TldrawUi({
	renderDebugMenuItems,
	children,
	hideUi,
	components,
	...rest
}: TldrawUiProps) {
	return (
		<TldrawUiContextProvider {...rest} components={components}>
			<TldrawUiInner hideUi={hideUi} renderDebugMenuItems={renderDebugMenuItems}>
				{children}
			</TldrawUiInner>
		</TldrawUiContextProvider>
	)
})

interface TldrawUiContentProps {
	hideUi?: boolean
	shareZone?: ReactNode
	topZone?: ReactNode
	renderDebugMenuItems?(): React.ReactNode
}

const TldrawUiInner = React.memo(function TldrawUiInner({
	children,
	hideUi,
	...rest
}: TldrawUiContentProps & { children: ReactNode }) {
	// The hideUi prop should prevent the UI from mounting.
	// If we ever need want the UI to mount and preserve state, then
	// we should change this behavior and hide the UI via CSS instead.

	return (
		<>
			{children}
			{hideUi ? null : <TldrawUiContent {...rest} />}
		</>
	)
})

const TldrawUiContent = React.memo(function TldrawUI() {
	const { Layout } = useTldrawUiComponents()

	useKeyboardShortcuts()
	useNativeClipboardEvents()
	useEditorEvents()

	return Layout ? <Layout /> : null
})
