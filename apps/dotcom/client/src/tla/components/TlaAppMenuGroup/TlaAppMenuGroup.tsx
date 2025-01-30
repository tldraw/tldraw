import { useAuth } from '@clerk/clerk-react'
import {
	ColorSchemeMenu,
	LanguageMenu,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useMaybeEditor,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaDebugMenuGroup } from '../TlaDebugMenuGroup'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	terms: { defaultMessage: 'Terms of service' },
	privacy: { defaultMessage: 'Privacy policy' },
	cookiePolicy: { defaultMessage: 'Cookie policy' },
	manageCookies: { defaultMessage: 'Manage cookies' },
	about: { defaultMessage: 'About' },
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

function ColorThemeSubmenu() {
	const editor = useMaybeEditor()
	if (!editor) return null
	return <ColorSchemeMenu />
}

function CookieConsentGroup() {
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuGroup id="consent">
			<TldrawUiMenuItem
				id="about"
				label={useMsg(messages.manageCookies)}
				icon="external-link"
				readonlyOk
				onSelect={() => {
					addDialog({ component: () => <TlaManageCookiesDialog /> })
				}}
			/>
		</TldrawUiMenuGroup>
	)
}

function HelpSubMenu() {
	const isSignedIn = useAuth().isSignedIn

	const openAndTrack = useOpenUrlAndTrack('main-menu')
	const msg = useMsg(messages.help)
	return (
		<TldrawUiMenuSubmenu id="help" label={msg}>
			{isSignedIn && <CookieConsentGroup />}
			<TldrawUiMenuGroup id="links">
				<TldrawUiMenuItem
					id="about"
					label={useMsg(messages.terms)}
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://tldraw.notion.site/terms-of-service')
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label={useMsg(messages.privacy)}
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://tldraw.notion.site/privacy-policy')
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label={useMsg(messages.cookiePolicy)}
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://tldraw.notion.site/cookie-policy')
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="tldraw">
				<TldrawUiMenuItem
					id="about"
					label={useMsg(messages.about)}
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://tldraw.dev')
					}}
				/>
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
