import { ColorSchemeMenu, LanguageMenu, TldrawUiMenuGroup, TldrawUiMenuSubmenu } from 'tldraw'
import { Links } from '../../../components/Links'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaDebugMenuGroup } from '../TlaDebugMenuGroup'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
})

export function TlaAppMenuGroup() {
	return (
		<TldrawUiMenuGroup id="things-to-do">
			<HelpSubMenu />
			<ColorThemeSubmenu />
			<LanguageMenu />
			<TlaDebugMenuGroup />
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

function HelpSubMenu() {
	const msg = useMsg(messages.help)
	return (
		<TldrawUiMenuSubmenu id="help" label={msg}>
			<Links />
		</TldrawUiMenuSubmenu>
	)
}
