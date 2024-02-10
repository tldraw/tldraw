import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import { Children } from 'react'
import { useMenuContext } from './TldrawUiMenuContext'

export function TldrawUiMenuGroup({
	id,
	small = false,
	children,
}: {
	id: string
	small?: boolean
	children?: any
}) {
	const menuType = useMenuContext()

	if (children && Children.count(children) === 0) return null

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.Group
					dir="ltr"
					className="tlui-menu__group"
					data-testid={`menu-group.${id}`}
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
					data-testid={`menu-item.${id}`}
				>
					{children}
				</_ContextMenu.Group>
			)
		}
	}
}
