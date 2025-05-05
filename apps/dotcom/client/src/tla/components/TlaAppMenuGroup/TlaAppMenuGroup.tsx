import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import { useNavigate } from 'react-router-dom'
import {
	ColorSchemeMenu,
	LanguageMenu,
	TLDRAW_FILE_EXTENSION,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useMaybeEditor,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaDebugMenuGroup } from '../TlaDebugMenuGroup'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	importFile: { defaultMessage: 'Import file…' },
	getHelp: { defaultMessage: 'User manual' },
	legalSummary: { defaultMessage: 'Legal summary' },
	terms: { defaultMessage: 'Terms of service' },
	privacy: { defaultMessage: 'Privacy policy' },
	cookiePolicy: { defaultMessage: 'Cookie policy' },
	manageCookies: { defaultMessage: 'Manage cookies' },
	about: { defaultMessage: 'About tldraw' },
	submitFeedback: { defaultMessage: 'Send feedback' },
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
			<TldrawUiMenuGroup id="settings-and-rare-actions">
				<ColorThemeSubmenu />
				<LanguageMenu />
				<TlaDebugMenuGroup />
				<ImportFileActionItem />
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

function ImportFileActionItem() {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const navigate = useNavigate()

	const importFileMsg = useMsg(messages.importFile)

	return (
		<TldrawUiMenuItem
			id="about"
			label={importFileMsg}
			icon="import"
			readonlyOk
			onSelect={async () => {
				const editor = getCurrentEditor()
				if (!editor) return
				if (!app) return

				trackEvent('import-tldr-file', { source: 'account-menu' })

				try {
					const tldrawFiles = await fileOpen({
						extensions: [TLDRAW_FILE_EXTENSION],
						multiple: true,
						description: 'tldraw project',
					})

					app.uploadTldrFiles(tldrawFiles, (file) => {
						navigate(routes.tlaFile(file.id), { state: { mode: 'create' } })
					})
				} catch {
					// user cancelled
					return
				}
			}}
		/>
	)
}
