import { useContainer } from '@tldraw/editor'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../Button/TldrawUiButtonLabel'
import {
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
} from '../TldrawUiDropdownMenu'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export interface TLUiMenuSubmenuProps<Translation extends string = string> {
	id: string
	label?: Translation | { [key: string]: Translation }
	disabled?: boolean
	children: ReactNode
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public @react */
export function TldrawUiMenuSubmenu<Translation extends string = string>({
	id,
	disabled = false,
	label,
	size = 'small',
	children,
}: TLUiMenuSubmenuProps<Translation>) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const container = useContainer()
	const msg = useTranslation()
	const labelToUse = label
		? typeof label === 'string'
			? label
			: (label[menuType] ?? label['default'])
		: undefined
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuSub id={`${sourceId}-sub.${id}`}>
					<TldrawUiDropdownMenuSubTrigger
						id={`${sourceId}-sub.${id}-button`}
						disabled={disabled}
						label={labelStr!}
						title={labelStr!}
					/>
					<TldrawUiDropdownMenuSubContent id={`${sourceId}-sub.${id}-content`} size={size}>
						{children}
					</TldrawUiDropdownMenuSubContent>
				</TldrawUiDropdownMenuSub>
			)
		}
		case 'context-menu': {
			if (disabled) return null

			return (
				<ContextMenuSubWithMenu id={`${sourceId}-sub.${id}`}>
					<_ContextMenu.ContextMenuSubTrigger dir="ltr" disabled={disabled} asChild>
						<TldrawUiButton
							data-testid={`${sourceId}-sub.${id}-button`}
							type="menu"
							className="tlui-menu__submenu__trigger"
						>
							<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="chevron-right" small />
						</TldrawUiButton>
					</_ContextMenu.ContextMenuSubTrigger>
					<_ContextMenu.ContextMenuPortal container={container}>
						<_ContextMenu.ContextMenuSubContent
							data-testid={`${sourceId}-sub.${id}-content`}
							className="tlui-menu tlui-menu__submenu__content"
							alignOffset={-1}
							sideOffset={-4}
							collisionPadding={4}
							data-size={size}
						>
							{children}
						</_ContextMenu.ContextMenuSubContent>
					</_ContextMenu.ContextMenuPortal>
				</ContextMenuSubWithMenu>
			)
		}
		default: {
			// no submenus in actions
			return children
		}
	}
}

/** @private */
export interface TLUiContextMenuSubProps {
	id: string
	children: ReactNode
}

/** @private */
export function ContextMenuSubWithMenu({ id, children }: TLUiContextMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_ContextMenu.ContextMenuSub open={open} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.ContextMenuSub>
	)
}
