import { unwrapLabel } from '../../hooks/useActions'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { ContextMenuGroup } from '../primitives/ContextMenu'
import { DropdownMenuGroup } from '../primitives/DropdownMenu'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export type TLUiMenuGroupProps = {
	id: string
	small?: boolean
	children?: any
}

/** @public */
export function TldrawUiMenuGroup({ id, small = false, children }: TLUiMenuGroupProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const msg = useTranslation()

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
				<DropdownMenuGroup
					data-testid={`${sourceId}-group.${id}`}
					data-size={small ? 'tiny' : 'medium'}
				>
					{children}
				</DropdownMenuGroup>
			)
		}
		case 'context-menu': {
			return (
				<ContextMenuGroup size={small ? 'tiny' : 'medium'} data-testid={`${sourceId}-group.${id}`}>
					{children}
				</ContextMenuGroup>
			)
		}
		case 'keyboard-shortcuts': {
			// todo: if groups need a label, let's give em a label
			const labelToUse = msg(unwrapLabel(id, 'keyboard-shortcuts'))
			return (
				<div className="tlui-shortcuts-dialog__group" data-testid={`${sourceId}-group.${id}`}>
					<h2 className="tlui-shortcuts-dialog__group__title">{labelToUse}</h2>
					<div className="tlui-shortcuts-dialog__group__content">{children}</div>
				</div>
			)
		}
		default: {
			return children
		}
	}
}
