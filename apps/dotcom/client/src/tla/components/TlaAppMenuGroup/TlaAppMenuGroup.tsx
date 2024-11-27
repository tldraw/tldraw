import {
	ColorSchemeMenu,
	LanguageMenu,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	TogglePasteAtCursorItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleWrapModeItem,
} from 'tldraw'
import { Links } from '../../../components/Links'
import { defineMessages, useMsg } from '../../utils/i18n'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
})

export function TlaAppMenuGroup() {
	return (
		<TldrawUiMenuGroup id="things-to-do">
			<HelpSubMenu />
			<ColorThemeSubmenu />
			<LanguageMenu />
		</TldrawUiMenuGroup>
	)
}

export function TlaAppMenuGroupLazyFlipped() {
	return (
		<TldrawUiMenuGroup id="things-to-do">
			<ColorThemeSubmenu />
			<LanguageMenu />
			<HelpSubMenu />
		</TldrawUiMenuGroup>
	)
}

function ColorThemeSubmenu() {
	return <ColorSchemeMenu />
}

function _PreferencesSubmenu() {
	return (
		<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
			<TldrawUiMenuGroup id="preferences-actions">
				<ToggleSnapModeItem />
				<ToggleToolLockItem />
				<ToggleGridItem />
				<ToggleWrapModeItem />
				<ToggleFocusModeItem />
				<ToggleEdgeScrollingItem />
				<ToggleReduceMotionItem />
				<ToggleDynamicSizeModeItem />
				<TogglePasteAtCursorItem />
				<ToggleDebugModeItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="color-scheme">
				<ColorSchemeMenu />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function HelpSubMenu() {
	const msg = useMsg(messages.help)
	return (
		<TldrawUiMenuSubmenu id="help" label={msg}>
			<Links />
		</TldrawUiMenuSubmenu>
	)
}
