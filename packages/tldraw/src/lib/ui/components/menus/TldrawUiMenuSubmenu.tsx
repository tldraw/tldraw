import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from '../primitives/ContextMenu'
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
}

/** @public */
export function TldrawUiMenuSubmenu<Translation extends string = string>({
	id,
	disabled = false,
	label,
	children,
}: TLUiMenuSubmenuProps<Translation>) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
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
					/>
					<DropdownMenuSubContent id={`${sourceId}-sub-content.${id}`}>
						{children}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			)
		}
		case 'context-menu': {
			return (
				<ContextMenuSub id={`${sourceId}-sub.${id}`}>
					<ContextMenuSubTrigger
						id={`${sourceId}-sub-trigger.${id}`}
						label={labelStr!}
						disabled={disabled}
					/>
					<ContextMenuSubContent id={`${sourceId}-sub-content.${id}`}>
						{children}
					</ContextMenuSubContent>
				</ContextMenuSub>
			)
		}
		default: {
			// no submenus in actions
			return children
		}
	}
}
