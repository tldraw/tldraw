import { tlenv, useEditor, useReactor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import React, { ReactNode, useMemo, useRef, useState } from 'react'
import { TLUiAssetUrlOverrides } from './assetUrls'
import { SkipToMainContent } from './components/A11y'
import { TldrawUiButton } from './components/primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './components/primitives/Button/TldrawUiButtonIcon'
import { PORTRAIT_BREAKPOINT, PORTRAIT_BREAKPOINTS } from './constants'
import {
	TLUiContextProviderProps,
	TldrawUiContextProvider,
} from './context/TldrawUiContextProvider'
import { useActions } from './context/actions'
import { useBreakpoint } from './context/breakpoints'
import { TLUiComponents, useTldrawUiComponents } from './context/components'
import { useNativeClipboardEvents } from './hooks/useClipboardEvents'
import { useEditorEvents } from './hooks/useEditorEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useReadonly } from './hooks/useReadonly'
import { useTranslation } from './hooks/useTranslation/useTranslation'

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
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()
	const isFocusMode = useValue('focus', () => editor.getInstanceState().isFocusMode, [editor])
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const {
		SharePanel,
		TopPanel,
		MenuPanel,
		StylePanel,
		Toolbar,
		HelpMenu,
		NavigationPanel,
		HelperButtons,
		DebugPanel,
		Toasts,
		Dialogs,
		A11y,
	} = useTldrawUiComponents()

	useKeyboardShortcuts()
	useNativeClipboardEvents()
	useEditorEvents()

	const rIsEditingAnything = useRef(false)
	const rHidingTimeout = useRef(-1 as any)
	const [hideToolbarWhileEditing, setHideToolbarWhileEditing] = useState(false)

	useReactor(
		'update hide toolbar while delayed',
		() => {
			const isMobileEnvironment = tlenv.isIos || tlenv.isAndroid
			if (!isMobileEnvironment) return

			const editingShape = editor.getEditingShapeId()
			if (editingShape === null) {
				if (rIsEditingAnything.current) {
					rIsEditingAnything.current = false
					clearTimeout(rHidingTimeout.current)
					if (tlenv.isAndroid) {
						// On Android, hide it after 150ms
						rHidingTimeout.current = editor.timers.setTimeout(() => {
							setHideToolbarWhileEditing(false)
						}, 150)
					} else {
						// On iOS, just hide it immediately
						setHideToolbarWhileEditing(false)
					}
				}
				return
			}

			if (!rIsEditingAnything.current) {
				rIsEditingAnything.current = true
				clearTimeout(rHidingTimeout.current)
				setHideToolbarWhileEditing(true)
			}
		},
		[]
	)

	const { 'toggle-focus-mode': toggleFocus } = useActions()

	const { breakpointsAbove, breakpointsBelow } = useMemo(() => {
		const breakpointsAbove = []
		const breakpointsBelow = []
		for (let bp = 0; bp < PORTRAIT_BREAKPOINTS.length; bp++) {
			if (bp <= breakpoint) {
				breakpointsAbove.push(bp)
			} else {
				breakpointsBelow.push(bp)
			}
		}
		return { breakpointsAbove, breakpointsBelow }
	}, [breakpoint])

	return (
		<div
			className={classNames('tlui-layout', {
				'tlui-layout__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
			})}
			// When the virtual keyboard is opening we want it to hide immediately.
			// But when the virtual keyboard is closing we want to wait a bit before showing it again.
			data-iseditinganything={hideToolbarWhileEditing}
			data-breakpoint={breakpoint}
			data-breakpoints-above={breakpointsAbove.join(' ')}
			data-breakpoints-below={breakpointsBelow.join(' ')}
		>
			<SkipToMainContent />
			{isFocusMode ? (
				<div className="tlui-layout__top">
					<TldrawUiButton
						type="icon"
						className="tlui-focus-button"
						title={msg('focus-mode.toggle-focus-mode')}
						onClick={() => toggleFocus.onSelect('menu')}
					>
						<TldrawUiButtonIcon icon="dot" />
					</TldrawUiButton>
				</div>
			) : (
				<>
					<div className="tlui-layout__top">
						<div className="tlui-layout__top__left">
							{MenuPanel && <MenuPanel />}
							{HelperButtons && <HelperButtons />}
						</div>
						<div className="tlui-layout__top__center">{TopPanel && <TopPanel />}</div>
						<div className="tlui-layout__top__right">
							{SharePanel && <SharePanel />}
							{StylePanel && breakpoint >= PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
								<StylePanel />
							)}
						</div>
					</div>
					<div className="tlui-layout__bottom">
						<div className="tlui-layout__bottom__main">
							{NavigationPanel && <NavigationPanel />}
							{Toolbar && <Toolbar />}
							{HelpMenu && <HelpMenu />}
						</div>
						{isDebugMode && DebugPanel && <DebugPanel />}
						{A11y && <A11y />}
					</div>
				</>
			)}
			{Toasts && <Toasts />}
			{Dialogs && <Dialogs />}
		</div>
	)
})

/** @public @react */
export function TldrawUiInFrontOfTheCanvas() {
	const { RichTextToolbar, ImageToolbar, VideoToolbar, CursorChatBubble, FollowingIndicator } =
		useTldrawUiComponents()

	return (
		<>
			{RichTextToolbar && <RichTextToolbar />}
			{ImageToolbar && <ImageToolbar />}
			{VideoToolbar && <VideoToolbar />}
			{FollowingIndicator && <FollowingIndicator />}
			{CursorChatBubble && <CursorChatBubble />}
		</>
	)
}
