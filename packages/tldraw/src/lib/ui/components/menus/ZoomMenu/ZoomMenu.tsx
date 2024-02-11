import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { ANIMATION_MEDIUM_MS, useContainer, useEditor, useValue } from '@tldraw/editor'
import { forwardRef, memo, useCallback } from 'react'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import tunnel from '../../../tunnel'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'
import { DefaultZoomMenu } from './DefaultZoomMenu'

const _ZoomMenuContent = tunnel(<DefaultZoomMenu />)

/** @public */
export const CustomZoomMenu = _ZoomMenuContent.In

/** @public */
export const ZoomMenu = memo(function ZoomMenu() {
	const container = useContainer()
	const [isOpen, onOpenChange] = useMenuIsOpen('zoom menu')

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
						<_ZoomMenuContent.Out />
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
			editor.resetZoom(editor.getViewportScreenCenter(), { duration: ANIMATION_MEDIUM_MS })
		}, [editor])

		return (
			<Button
				ref={ref}
				{...props}
				type="icon"
				title={`${msg('navigation-zone.zoom')}`}
				data-testid="minimap.zoom-menu"
				className={breakpoint < 5 ? 'tlui-zoom-menu__button' : 'tlui-zoom-menu__button__pct'}
				onDoubleClick={handleDoubleClick}
				icon={breakpoint < 4 ? 'zoom-in' : undefined}
			>
				{breakpoint < 4 ? null : (
					<span style={{ flexGrow: 0, textAlign: 'center' }}>{Math.floor(zoom * 100)}%</span>
				)}
			</Button>
		)
	}
)
