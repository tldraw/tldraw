import { useAuth } from '@clerk/clerk-react'
import {
	ColorSchemeMenu,
	LanguageMenu,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useMaybeEditor,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaDebugMenuGroup } from '../TlaDebugMenuGroup'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	getHelp: { defaultMessage: 'User manual' },
	legalSummary: { defaultMessage: 'Legal summary' },
	terms: { defaultMessage: 'Terms of service' },
	privacy: { defaultMessage: 'Privacy policy' },
	cookiePolicy: { defaultMessage: 'Cookie policy' },
	manageCookies: { defaultMessage: 'Manage cookies' },
	about: { defaultMessage: 'About tldraw' },
	submitFeedback: { defaultMessage: 'Give us feedback' },
})

export function TlaAppMenuGroup() {
	const isSignedIn = useAuth().isSignedIn

	return (
		<>
			<TldrawUiMenuGroup id="signed-in-help">
				<UserManualMenuItem />
				<GiveUsFeedbackMenuItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="links">
				<LegalSummaryMenuItem />
				{isSignedIn && <CookieConsentMenuItem />}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="settings">
				<ColorThemeSubmenu />
				<LanguageMenu />
				<TlaDebugMenuGroup />
			</TldrawUiMenuGroup>
		</>
	)
}

function ColorThemeSubmenu() {
	const editor = useMaybeEditor()
	if (!editor) return null
	return <ColorSchemeMenu />
}

function CookieConsentMenuItem() {
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="cookie-consent"
			label={useMsg(messages.manageCookies)}
			icon="external-link"
			readonlyOk
			onSelect={() => {
				addDialog({ component: () => <TlaManageCookiesDialog /> })
			}}
		/>
	)
}

function UserManualMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="give-us-feedback"
			label={useMsg(messages.getHelp)}
			iconLeft="bookmark"
			readonlyOk
			onSelect={() => {
				openAndTrack('https://tldraw.notion.site/support')
			}}
		/>
	)
}

function GiveUsFeedbackMenuItem() {
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="give-us-feedback"
			label={useMsg(messages.submitFeedback)}
			iconLeft="comment"
			readonlyOk
			onSelect={() => {
				addDialog({ component: SubmitFeedbackDialog })
			}}
		/>
	)
}

// function AboutTldrawMenuItem() {
// 	const openAndTrack = useOpenUrlAndTrack('main-menu')
// 	return (
// 		<TldrawUiMenuItem
// 			id="about"
// 			label={useMsg(messages.about)}
// 			icon="external-link"
// 			readonlyOk
// 			onSelect={() => {
// 				openAndTrack(
// 					'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=learn-more'
// 				)
// 			}}
// 		/>
// 	)
// }

function LegalSummaryMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="tos"
			label={useMsg(messages.legalSummary)}
			icon="external-link"
			readonlyOk
			onSelect={() => {
				openAndTrack('https://tldraw.notion.site/legal')
			}}
		/>
	)
}
