import { ContextMenuGroup } from '@radix-ui/react-context-menu'
import { unwrapLabel } from '../../context/actions'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
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
