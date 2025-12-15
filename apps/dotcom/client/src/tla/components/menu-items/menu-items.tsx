import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ColorSchemeMenu,
	TLDRAW_FILE_EXTENSION,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useMaybeEditor,
	useValue,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../routeDefs'
import { signoutAnalytics } from '../../../utils/analytics'
import { useMaybeApp } from '../../hooks/useAppState'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { defineMessages, useMsg } from '../../utils/i18n'
import { clearLocalSessionState } from '../../utils/local-session-state'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'
import { TlaWhatsNewDialog } from '../dialogs/TlaWhatsNewDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	// user menu
	accountMenu: { defaultMessage: 'User settings' },
	signOut: { defaultMessage: 'Sign out' },
	importFile: { defaultMessage: 'Import file…' },
	dotdev: { defaultMessage: 'Try the tldraw SDK' },
	// account menu
	getHelp: { defaultMessage: 'User manual' },
	whatsNew: { defaultMessage: "What's new" },
	legalSummary: { defaultMessage: 'Legal summary' },
	terms: { defaultMessage: 'Terms of service' },
	privacy: { defaultMessage: 'Privacy policy' },
	cookiePolicy: { defaultMessage: 'Cookie policy' },
	manageCookies: { defaultMessage: 'Manage cookies' },
	about: { defaultMessage: 'About tldraw' },
	submitFeedback: { defaultMessage: 'Send feedback' },
	// debug
	appDebugFlags: { defaultMessage: 'App debug flags' },
	langAccented: { defaultMessage: 'i18n: Accented' },
	langLongString: { defaultMessage: 'i18n: Long String' },
	langHighlightMissing: { defaultMessage: 'i18n: Highlight Missing' },
})

export function SignOutMenuItem() {
	const auth = useAuth()

	const trackEvent = useTldrawAppUiEvents()

	const label = useMsg(messages.signOut)

	const handleSignout = useCallback(() => {
		signoutAnalytics()
		auth.signOut().then(clearLocalSessionState)
		trackEvent('sign-out-clicked', { source: 'sidebar' })
	}, [auth, trackEvent])

	if (!auth.isSignedIn) return
	return (
		<TldrawUiMenuGroup id="account-actions">
			<TldrawUiMenuItem
				id="sign-out"
				data-testid="tla-user-sign-out"
				onSelect={handleSignout}
				label={label}
				readonlyOk
			/>
		</TldrawUiMenuGroup>
	)
}

export function ColorThemeSubmenu() {
	const editor = useMaybeEditor()
	if (!editor) return null
	return <ColorSchemeMenu />
}

export function CookieConsentMenuItem() {
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="cookie-consent"
			label={useMsg(messages.manageCookies)}
			readonlyOk
			onSelect={() => {
				addDialog({ component: () => <TlaManageCookiesDialog /> })
			}}
		/>
	)
}

export function UserManualMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="user-manual"
			label={useMsg(messages.getHelp)}
			iconLeft="manual"
			readonlyOk
			onSelect={() => {
				openAndTrack('https://tldraw.notion.site/support')
			}}
		/>
	)
}

export function WhatsNewMenuGroup() {
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const user = useValue('auth', () => app?.getUser(), [app])
	const { entries } = useWhatsNew()
	const whatsNewLabel = useMsg(messages.whatsNew)

	const latestVersion = entries[0]?.version
	const hasNewContent = latestVersion && user?.whatsNewSeenVersion !== latestVersion

	const handleWhatsNewClick = useCallback(() => {
		trackEvent('open-whats-new-dialog', { source: 'sidebar' })
		if (latestVersion && app) {
			app.z.mutate.user.updateWhatsNewSeenVersion({ version: latestVersion })
		}
		addDialog({ component: TlaWhatsNewDialog })
	}, [trackEvent, latestVersion, app, addDialog])

	if (entries.length === 0 || !user || !app) return null

	return (
		<TldrawUiMenuGroup
			id="whats-new"
			className={hasNewContent ? 'whats-new-has-update' : undefined}
		>
			<TldrawUiMenuItem
				id="whats-new"
				label={whatsNewLabel}
				iconLeft="info-circle"
				readonlyOk
				onSelect={handleWhatsNewClick}
			/>
		</TldrawUiMenuGroup>
	)
}

export function GiveUsFeedbackMenuItem() {
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

export function DotDevMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="tos"
			label={useMsg(messages.dotdev)}
			iconLeft="external-link"
			readonlyOk
			onSelect={() => {
				openAndTrack(
					'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-menu',
					true
				)
			}}
		/>
	)
}

export function LegalSummaryMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="tos"
			label={useMsg(messages.legalSummary)}
			readonlyOk
			onSelect={() => {
				openAndTrack('/legal.html')
			}}
		/>
	)
}

export function ImportFileActionItem() {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const navigate = useNavigate()

	const importFileMsg = useMsg(messages.importFile)

	return (
		<TldrawUiMenuItem
			id="about"
			label={importFileMsg}
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

					app.uploadTldrFiles(tldrawFiles, (fileId) => {
						navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
					})
				} catch {
					// user cancelled
					return
				}
			}}
		/>
	)
}

export function DebugMenuGroup() {
	const maybeEditor = useMaybeEditor()
	const isDebugMode = useValue('debug', () => maybeEditor?.getInstanceState().isDebugMode, [
		maybeEditor,
	])
	if (!isDebugMode) return null

	return <DebugSubmenu />
}

export function DebugSubmenu() {
	const editor = useMaybeEditor()
	const appFlagsLbl = useMsg(messages.appDebugFlags)

	const [shouldHighlightMissing, setShouldHighlightMissing] = useState(
		document.body.classList.contains('tla-lang-highlight-missing')
	)
	const debugLanguageFlags = [
		{ name: useMsg(messages.langAccented), locale: 'xx-AE' },
		{ name: useMsg(messages.langLongString), locale: 'xx-LS' },
		{ name: useMsg(messages.langHighlightMissing), locale: 'xx-MS' },
	]

	useEffect(() => {
		document.body.classList.toggle('tla-lang-highlight-missing', shouldHighlightMissing)
	}, [shouldHighlightMissing])

	return (
		<TldrawUiMenuSubmenu id="debug" label={appFlagsLbl}>
			<TldrawUiMenuGroup id="debug app flags">
				{debugLanguageFlags.map((flag) => (
					<TldrawUiMenuCheckboxItem
						key={flag.name}
						id={flag.name}
						title={flag.name}
						label={flag.name
							.replace(/([a-z0-9])([A-Z])/g, (m) => `${m[0]} ${m[1].toLowerCase()}`)
							.replace(/^[a-z]/, (m) => m.toUpperCase())}
						checked={
							flag.locale === 'xx-MS'
								? shouldHighlightMissing
								: editor?.user.getLocale() === flag.locale
						}
						onSelect={() => {
							if (flag.locale === 'xx-MS') {
								setShouldHighlightMissing(!shouldHighlightMissing)
							} else {
								editor?.user.updateUserPreferences({ locale: flag.locale })
							}
						}}
					/>
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
