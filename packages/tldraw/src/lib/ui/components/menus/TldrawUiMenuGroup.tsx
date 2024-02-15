import { ContextMenuGroup } from '@radix-ui/react-context-menu'
import { unwrapLabel } from '../../context/actions'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { DropdownMenuGroup } from '../primitives/DropdownMenu'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export type TLUiMenuGroupProps<TranslationKey extends string = string> = {
	id: string
	/**
	 * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
	 */
	label?: TranslationKey | { [key: string]: TranslationKey }
	small?: boolean
	children?: any
}

/** @public */
export function TldrawUiMenuGroup({ id, label, small = false, children }: TLUiMenuGroupProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const msg = useTranslation()
	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuType) {
		case 'panel': {
			return (
				<div className="tlui-menu__group" data-testid={`${sourceId}-group.${id}`}>
					{children}
				</div>
			)
		}
		case 'menu': {
			return (
				<DropdownMenuGroup data-testid={`${sourceId}-group.${id}`} size={small ? 'tiny' : 'medium'}>
					{children}
				</DropdownMenuGroup>
			)
		}
		case 'context-menu': {
			return (
				<ContextMenuGroup
					dir="ltr"
					className="tlui-menu__group"
					data-size={small ? 'tiny' : 'medium'}
					data-testid={`${sourceId}-group.${id}`}
				>
					{children}
				</ContextMenuGroup>
			)
		}
		case 'keyboard-shortcuts': {
			// todo: if groups need a label, let's give em a label
			return (
				<div className="tlui-shortcuts-dialog__group" data-testid={`${sourceId}-group.${id}`}>
					<h2 className="tlui-shortcuts-dialog__group__title">{labelStr}</h2>
					<div className="tlui-shortcuts-dialog__group__content">{children}</div>
				</div>
			)
		}
		default: {
			return children
		}
	}
}
