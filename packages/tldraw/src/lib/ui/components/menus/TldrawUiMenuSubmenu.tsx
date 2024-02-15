import {
	ContextMenuPortal,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from '@radix-ui/react-context-menu'
import { useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from '../primitives/DropdownMenu'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export type TLUiMenuSubmenuProps<Translation extends string = string> = {
	id: string
	label?: Translation | { [key: string]: Translation }
	disabled?: boolean
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'large'
}

/** @public */
export function TldrawUiMenuSubmenu<Translation extends string = string>({
	id,
	disabled = false,
	label,
	size,
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
				<DropdownMenuSub id={`${sourceId}-sub.${id}`}>
					<DropdownMenuSubTrigger
						id={`${sourceId}-sub.${id}`}
						disabled={disabled}
						label={labelStr!}
						title={labelStr!}
					/>
					<DropdownMenuSubContent id={`${sourceId}-sub-content.${id}`} data-size={size}>
						{children}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			)
		}
		case 'context-menu': {
			return (
				<ContextMenuSubWithMenu id={`${sourceId}-sub.${id}`}>
					<ContextMenuSubTrigger
						dir="ltr"
						disabled={disabled}
						data-testid={`${sourceId}-sub-trigger.${id}`}
						asChild
					>
						<TldrawUiButton type="menu" className="tlui-menu__submenu__trigger">
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
export type TLUiContextMenuSubProps = { id: string; children: any }

/** @private */
export function ContextMenuSubWithMenu({ id, children }: TLUiContextMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<ContextMenuSub open={open} onOpenChange={onOpenChange}>
			{children}
		</ContextMenuSub>
	)
}
