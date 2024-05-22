import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { ANIMATION_MEDIUM_MS, useContainer, useEditor, useValue } from '@tldraw/editor'
import { ReactNode, forwardRef, memo, useCallback } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultZoomMenuContent } from './DefaultZoomMenuContent'

/** @public */
export interface TLUiZoomMenuProps {
	children?: ReactNode
}

/** @public */
export const DefaultZoomMenu = memo(function DefaultZoomMenu({ children }: TLUiZoomMenuProps) {
	const container = useContainer()
	const [isOpen, onOpenChange] = useMenuIsOpen('zoom menu')

	// Get the zoom menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultZoomMenuContent />

	return (
		<_Dropdown.Root dir="ltr" open={isOpen} onOpenChange={onOpenChange} modal={false}>
			<_Dropdown.Trigger asChild dir="ltr">
				<ZoomTriggerButton />
			</_Dropdown.Trigger>
			<_Dropdown.Portal container={container}>
				<_Dropdown.Content
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
				</_Dropdown.Content>
			</_Dropdown.Portal>
		</_Dropdown.Root>
	)
})

const ZoomTriggerButton = forwardRef<HTMLButtonElement, any>(
	function ZoomTriggerButton(props, ref) {
		const editor = useEditor()
		const breakpoint = useBreakpoint()
		const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
		const msg = useTranslation()

		const handleDoubleClick = useCallback(() => {
			editor.resetZoom(editor.getViewportScreenCenter(), {
				animation: { duration: ANIMATION_MEDIUM_MS },
			})
		}, [editor])

		return (
			<TldrawUiButton
				ref={ref}
				{...props}
				type="icon"
				title={`${msg('navigation-zone.zoom')}`}
				data-testid="minimap.zoom-menu-button"
				className={
					breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
						? 'tlui-zoom-menu__button'
						: 'tlui-zoom-menu__button__pct'
				}
				onDoubleClick={handleDoubleClick}
				icon={breakpoint < PORTRAIT_BREAKPOINT.MOBILE ? 'zoom-in' : undefined}
			>
				{breakpoint < PORTRAIT_BREAKPOINT.MOBILE ? null : (
					<span style={{ flexGrow: 0, textAlign: 'center' }}>{Math.floor(zoom * 100)}%</span>
				)}
			</TldrawUiButton>
		)
	}
)
