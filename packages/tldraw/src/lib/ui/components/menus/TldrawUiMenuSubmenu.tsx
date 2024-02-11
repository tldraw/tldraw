import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuSubmenu<TransationKey extends string = string>({
	id,
	disabled = false,
	label,
	children,
}: {
	id: string
	label?: TransationKey | { [key: string]: TransationKey }
	disabled?: boolean
	children: any
}) {
	const container = useContainer()
	const { type: menuType } = useTldrawUiMenuContext()
	const msg = useTranslation()
	const labelToUse = label
		? typeof label === 'string'
			? label
			: label[menuType] ?? label['default']
		: undefined
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	const [_, onOpenChange] = useMenuIsOpen(`context menu sub`)

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.Sub onOpenChange={onOpenChange}>
					<_DropdownMenu.SubTrigger dir="ltr" disabled={disabled} asChild>
						<Button
							type="menu"
							className="tlui-menu__submenu__trigger"
							data-testid={`menu-item.${id}`}
							label={labelStr}
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
			return (
				<_ContextMenu.Sub onOpenChange={onOpenChange}>
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
						<_ContextMenu.SubContent
							className="tlui-menu"
							sideOffset={-4}
							alignOffset={-1}
							collisionPadding={4}
						>
							{children}
						</_ContextMenu.SubContent>
					</_ContextMenu.Portal>
				</_ContextMenu.Sub>
			)
		}
		case 'actions': {
			// no submenus in actions
			return children
		}
	}
}
