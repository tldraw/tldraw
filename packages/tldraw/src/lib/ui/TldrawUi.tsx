import { ToastProvider } from '@radix-ui/react-toast'
import { useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import React, { ReactNode } from 'react'
import { TldrawUiContextProvider, TldrawUiContextProviderProps } from './TldrawUiContextProvider'
import { BackToContent } from './components/BackToContent'
import { DebugPanel } from './components/DebugPanel'
import { Dialogs } from './components/Dialogs'
import { FollowingIndicator } from './components/FollowingIndicator'
import { HelpMenu } from './components/HelpMenu'
import { MenuZone } from './components/MenuZone'
import { NavigationZone } from './components/NavigationZone/NavigationZone'
import { ExitPenMode } from './components/PenModeToggle'
import { StopFollowing } from './components/StopFollowing'
import { StylePanel } from './components/StylePanel/StylePanel'
import { ToastViewport, Toasts } from './components/Toasts'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Button } from './components/primitives/Button'
import { useActions } from './hooks/useActions'
import { useBreakpoint } from './hooks/useBreakpoint'
import { useNativeClipboardEvents } from './hooks/useClipboardEvents'
import { useEditorEvents } from './hooks/useEditorEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTranslation } from './hooks/useTranslation/useTranslation'

/**
 * Props for the {@link @tldraw/tldraw#Tldraw} and {@link TldrawUi} components.
 *
 * @public
 */
export type TldrawUiProps = TldrawUiBaseProps & TldrawUiContextProviderProps

/**
 * Base props for the {@link @tldraw/tldraw#Tldraw} and {@link TldrawUi} components.
 *
 * @public
 */
export interface TldrawUiBaseProps {
	/**
	 * The component's children.
	 */
	children?: ReactNode

	/**
	 * Whether to hide the user interface and only display the canvas.
	 */
	hideUi?: boolean

	/**
	 * A component to use for the share zone (will be deprecated)
	 */
	shareZone?: ReactNode

	/**
	 * A component to use for the top zone (will be deprecated)
	 * @internal
	 */
	topZone?: ReactNode

	/**
	 * Additional items to add to the debug menu (will be deprecated)
	 */
	renderDebugMenuItems?: () => React.ReactNode
}

/**
 * @public
 */
export const TldrawUi = React.memo(function TldrawUi({
	shareZone,
	topZone,
	renderDebugMenuItems,
	children,
	hideUi,
	...rest
}: TldrawUiProps) {
	return (
		<TldrawUiContextProvider {...rest}>
			<TldrawUiInner
				hideUi={hideUi}
				shareZone={shareZone}
				topZone={topZone}
				renderDebugMenuItems={renderDebugMenuItems}
			>
				{children}
			</TldrawUiInner>
		</TldrawUiContextProvider>
	)
})

type TldrawUiContentProps = {
	hideUi?: boolean
	shareZone?: ReactNode
	topZone?: ReactNode
	renderDebugMenuItems?: () => React.ReactNode
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

const TldrawUiContent = React.memo(function TldrawUI({
	shareZone,
	topZone,
	renderDebugMenuItems,
}: TldrawUiContentProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useValue('isReadonlyMode', () => editor.instanceState.isReadonly, [editor])
	const isFocusMode = useValue('focus', () => editor.instanceState.isFocusMode, [editor])
	const isDebugMode = useValue('debug', () => editor.instanceState.isDebugMode, [editor])

	useKeyboardShortcuts()
	useNativeClipboardEvents()
	useEditorEvents()

	const { 'toggle-focus-mode': toggleFocus } = useActions()

	return (
		<ToastProvider>
			<div
				className={classNames('tlui-layout', {
					'tlui-layout__mobile': breakpoint < 5,
				})}
			>
				{isFocusMode ? (
					<div className="tlui-layout__top">
						<Button
							className="tlui-focus-button"
							title={`${msg('focus-mode.toggle-focus-mode')}`}
							icon="dot"
							onClick={() => toggleFocus.onSelect('menu')}
						/>
					</div>
				) : (
					<>
						<div className="tlui-layout__top">
							<div className="tlui-layout__top__left">
								<MenuZone />
								<div className="tlui-helper-buttons">
									<ExitPenMode />
									<BackToContent />
									<StopFollowing />
								</div>
							</div>
							<div className="tlui-layout__top__center">{topZone}</div>
							<div className="tlui-layout__top__right">
								{shareZone}
								{breakpoint >= 5 && !isReadonlyMode && (
									<div className="tlui-style-panel__wrapper">
										<StylePanel />
									</div>
								)}
							</div>
						</div>
						<div className="tlui-layout__bottom">
							<div className="tlui-layout__bottom__main">
								<NavigationZone />
								<Toolbar />
								{breakpoint >= 4 && <HelpMenu />}
							</div>
							{isDebugMode && <DebugPanel renderDebugMenuItems={renderDebugMenuItems ?? null} />}
						</div>
					</>
				)}
				<Toasts />
				<Dialogs />
				<ToastViewport />
				<FollowingIndicator />
			</div>
		</ToastProvider>
	)
})
