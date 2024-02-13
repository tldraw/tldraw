import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import { unwrapLabel } from '../../hooks/useActions'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuGroup({
	id,
	small = false,
	children,
}: {
	id: string
	small?: boolean
	children?: any
}) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const msg = useTranslation()

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.Group
					dir="ltr"
					className="tlui-menu__group"
					data-testid={`${sourceId}-group.${id}`}
					data-size={small ? 'tiny' : 'medium'}
				>
					{children}
				</_DropdownMenu.Group>
			)
		}
		case 'context-menu': {
			return (
				<_ContextMenu.Group
					dir="ltr"
					className={classNames('tlui-menu__group', {
						'tlui-menu__group__small': small,
					})}
					data-testid={`${sourceId}-group.${id}`}
				>
					{children}
				</_ContextMenu.Group>
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
