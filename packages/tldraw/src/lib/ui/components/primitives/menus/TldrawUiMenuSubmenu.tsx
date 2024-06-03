import {
	ContextMenuPortal,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from '@radix-ui/react-context-menu'
import { useContainer } from '@tldraw/editor'
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

/** @public */
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
			: label[menuType] ?? label['default']
		: undefined
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuSub id={`${sourceId}-sub.${id}`}>
					<TldrawUiDropdownMenuSubTrigger
						id={`${sourceId}-sub.${labelStr ? labelStr.toLowerCase() + '-button' : ''}`}
						disabled={disabled}
						label={labelStr!}
						title={labelStr!}
					/>
					<TldrawUiDropdownMenuSubContent
						id={`${sourceId}-sub.${labelStr ? labelStr.toLowerCase() + '-content' : ''}`}
						size={size}
					>
						{children}
					</TldrawUiDropdownMenuSubContent>
				</TldrawUiDropdownMenuSub>
			)
		}
		case 'context-menu': {
			if (disabled) return null

			return (
				<ContextMenuSubWithMenu id={`${sourceId}-sub.${id}`}>
					<ContextMenuSubTrigger dir="ltr" disabled={disabled} asChild>
						<TldrawUiButton
							data-testid={`${sourceId}-sub-trigger.${id}`}
							type="menu"
							className="tlui-menu__submenu__trigger"
						>
							<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="chevron-right" small />
						</TldrawUiButton>
					</ContextMenuSubTrigger>
					<ContextMenuPortal container={container}>
						<ContextMenuSubContent
							data-testid={`${sourceId}-sub-content.${id}`}
							className="tlui-menu tlui-menu__submenu__content"
							alignOffset={-1}
							sideOffset={-4}
							collisionPadding={4}
							data-size={size}
						>
							{children}
						</ContextMenuSubContent>
					</ContextMenuPortal>
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
		<ContextMenuSub open={open} onOpenChange={onOpenChange}>
			{children}
		</ContextMenuSub>
	)
}
