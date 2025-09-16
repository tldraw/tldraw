import { ToggleMouseItem, ToggleTrackpadItem } from './menu-items'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/** @public @react */
export function PointerPeripheralMenu() {
	return (
		<TldrawUiMenuSubmenu id="help menu pointer peripherals" label="menu.mouse-trackpad">
			<TldrawUiMenuGroup id="mouse-trackpad">
				<ToggleTrackpadItem />
				<ToggleMouseItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
