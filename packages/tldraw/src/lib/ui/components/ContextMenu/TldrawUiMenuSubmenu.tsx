import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { useMenuContext } from './TldrawUiMenuContext'

export function TldrawUiMenuSubmenu({
	id,
	disabled = false,
	label,
	contextMenuLabel,
	children,
}: {
	id: string
	label: string
	contextMenuLabel?: string
	disabled?: boolean
	children: any
}) {
	const container = useContainer()
	const menuType = useMenuContext()
	const msg = useTranslation()

	const [open, onOpenChange] = useMenuIsOpen(`${menuType} ${id} menu sub`)

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
					<_DropdownMenu.SubTrigger dir="ltr" disabled={disabled} asChild>
						<Button
							type="menu"
							className="tlui-menu__submenu__trigger"
							data-testid={`menu-item.${id}`}
							label={label}
							icon="chevron-right"
						/>
					</_DropdownMenu.SubTrigger>
					<_DropdownMenu.Portal container={container}>
						<_DropdownMenu.SubContent
							className="tlui-menu"
							sideOffset={-4}
							alignOffset={-1}
							collisionPadding={4}
						>
							{children}
						</_DropdownMenu.SubContent>
					</_DropdownMenu.Portal>
				</_DropdownMenu.Sub>
			)
		}
		case 'context-menu': {
			const labelToUse = contextMenuLabel ?? label
			const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

			return (
				<_ContextMenu.Sub open={open} onOpenChange={onOpenChange}>
					<_ContextMenu.SubTrigger dir="ltr" disabled={disabled} asChild>
						<Button
							type="menu"
							className="tlui-menu__submenu__trigger"
							data-testid={`menu-item.${id}`}
							label={labelStr}
							icon="chevron-right"
						/>
					</_ContextMenu.SubTrigger>
					<_ContextMenu.Portal container={container}>
						<_ContextMenu.SubContent className="tlui-menu" sideOffset={-4} collisionPadding={4}>
							{children}
						</_ContextMenu.SubContent>
					</_ContextMenu.Portal>
				</_ContextMenu.Sub>
			)
		}
	}
}
