import { useContainer, useEditor, useValue } from '@tldraw/editor'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode, memo, useCallback } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultZoomMenuContent } from './DefaultZoomMenuContent'

/** @public */
export interface TLUiZoomMenuProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultZoomMenu = memo(function DefaultZoomMenu({ children }: TLUiZoomMenuProps) {
	const container = useContainer()
	const [isOpen, onOpenChange] = useMenuIsOpen('zoom menu')

	// Get the zoom menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultZoomMenuContent />

	return (
		<_DropdownMenu.Root dir="ltr" open={isOpen} onOpenChange={onOpenChange} modal={false}>
			<ZoomTriggerButton />
			<_DropdownMenu.Portal container={container}>
				<_DropdownMenu.Content
					className="tlui-menu"
					side="top"
					align="start"
					alignOffset={0}
					sideOffset={8}
					collisionPadding={4}
				>
					<TldrawUiMenuContextProvider type="menu" sourceId="zoom-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</_DropdownMenu.Content>
			</_DropdownMenu.Portal>
		</_DropdownMenu.Root>
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
		<TldrawUiToolbarButton
			asChild
			type="icon"
			aria-label={`${msg('navigation-zone.zoom')} — ${value}`}
			title={`${msg('navigation-zone.zoom')} — ${value}`}
			data-testid="minimap.zoom-menu-button"
			className="tlui-zoom-menu__button"
			onDoubleClick={handleDoubleClick}
		>
			<_DropdownMenu.Trigger dir="ltr">
				{breakpoint < PORTRAIT_BREAKPOINT.MOBILE ? null : (
					<span style={{ flexGrow: 0, textAlign: 'center' }}>{value}</span>
				)}
			</_DropdownMenu.Trigger>
		</TldrawUiToolbarButton>
	)
}
