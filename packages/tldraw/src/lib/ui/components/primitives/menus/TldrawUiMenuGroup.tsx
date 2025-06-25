import classNames from 'classnames'
import { ReactNode } from 'react'
import { unwrapLabel } from '../../../context/actions'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiDropdownMenuGroup } from '../TldrawUiDropdownMenu'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export interface TLUiMenuGroupProps<TranslationKey extends string = string> {
	id: string
	/**
	 * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
	 */
	label?: TranslationKey | { [key: string]: TranslationKey }
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TldrawUiMenuGroup({ id, label, className, children }: TLUiMenuGroupProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const msg = useTranslation()
	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuType) {
		case 'panel': {
			return (
				<div
					className={classNames('tlui-menu__group', className)}
					data-testid={`${sourceId}-group.${id}`}
				>
					{children}
				</div>
			)
		}
		case 'menu': {
			return (
				<TldrawUiDropdownMenuGroup className={className} data-testid={`${sourceId}-group.${id}`}>
					{children}
				</TldrawUiDropdownMenuGroup>
			)
		}
		case 'context-menu': {
			return (
				<div
					dir="ltr"
					className={classNames('tlui-menu__group', className)}
					data-testid={`${sourceId}-group.${id}`}
				>
					{children}
				</div>
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
