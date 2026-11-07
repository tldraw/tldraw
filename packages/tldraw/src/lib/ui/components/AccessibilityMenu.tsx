import { defineMessages } from '@tldraw/editor'
import {
	ToggleEnhancedA11yModeItem,
	ToggleKeyboardShortcutsItem,
	ToggleReduceMotionItem,
} from './menu-items'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

const messages = defineMessages({
	menuAccessibility: { id: 'menu.accessibility', defaultMessage: 'Accessibility' },
})

/** @public @react */
export function AccessibilityMenu() {
	return (
		<TldrawUiMenuSubmenu id="help menu accessibility" label={messages.menuAccessibility.id}>
			<TldrawUiMenuGroup id="accessibility">
				<ToggleReduceMotionItem />
				<ToggleKeyboardShortcutsItem />
				<ToggleEnhancedA11yModeItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
