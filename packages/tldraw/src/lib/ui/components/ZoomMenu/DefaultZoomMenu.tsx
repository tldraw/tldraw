import { useEditor, useValue } from '@tldraw/editor'
import { TlDropdownMenuContent, TlDropdownMenuRoot, TlDropdownMenuTrigger } from '@tldraw/ui'
import { TlToolbarButton } from '@tldraw/ui'
import { ReactNode, memo, useCallback } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultZoomMenuContent } from './DefaultZoomMenuContent'

/** @public */
export interface TLUiZoomMenuProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultZoomMenu = memo(function DefaultZoomMenu({ children }: TLUiZoomMenuProps) {
	// Get the zoom menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultZoomMenuContent />

	return (
		<TlDropdownMenuRoot id="zoom menu" modal={false}>
			<ZoomTriggerButton />
			<TlDropdownMenuContent
				side="top"
				align="start"
				alignOffset={0}
				sideOffset={8}
				collisionPadding={4}
			>
				<TldrawUiMenuContextProvider type="menu" sourceId="zoom-menu">
					{content}
				</TldrawUiMenuContextProvider>
			</TlDropdownMenuContent>
		</TlDropdownMenuRoot>
	)
})

const ZoomTriggerButton = () => {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
	const msg = useTranslation()

	const handleDoubleClick = useCallback(() => {
		editor.resetZoom(editor.getViewportScreenCenter(), {
			animation: { duration: editor.options.animationMediumMs },
		})
	}, [editor])

	const value = `${Math.floor(zoom * 100)}%`
	return (
		<TlDropdownMenuTrigger>
			<TlToolbarButton
				type="icon"
				aria-label={`${msg('navigation-zone.zoom')} — ${value}`}
				title={`${msg('navigation-zone.zoom')} — ${value}`}
				data-testid="minimap.zoom-menu-button"
				className="tlui-zoom-menu__button"
				onDoubleClick={handleDoubleClick}
			>
				{breakpoint < PORTRAIT_BREAKPOINT.MOBILE ? null : (
					<span style={{ flexGrow: 0, textAlign: 'center' }}>{value}</span>
				)}
			</TlToolbarButton>
		</TlDropdownMenuTrigger>
	)
}
