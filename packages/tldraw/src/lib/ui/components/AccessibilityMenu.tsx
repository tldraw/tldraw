import {
	ToggleKeyboardShortcutsItem,
	ToggleReduceMotionItem,
	ToggleUiLabelsItem,
} from './menu-items'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/** @public @react */
export function AccessibilityMenu() {
	return (
		<TldrawUiMenuSubmenu id="help menu accessibility" label="menu.accessibility">
			<TldrawUiMenuGroup id="accessibility">
				<ToggleReduceMotionItem />
				<ToggleKeyboardShortcutsItem />
				<ToggleUiLabelsItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
