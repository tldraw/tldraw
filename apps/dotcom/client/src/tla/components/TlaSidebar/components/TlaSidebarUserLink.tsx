import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import classNames from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ColorSchemeMenu,
	LanguageMenu,
	TLDRAW_FILE_EXTENSION,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useMaybeEditor,
	useValue,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../../routeDefs'
import { useApp, useMaybeApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getCurrentEditor } from '../../../utils/getCurrentEditor'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { clearLocalSessionState } from '../../../utils/local-session-state'
import { TlaAvatar } from '../../TlaAvatar/TlaAvatar'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { SubmitFeedbackDialog } from '../../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../../dialogs/TlaManageCookiesDialog'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	// user menu
	accountMenu: { defaultMessage: 'User settings' },
	signOut: { defaultMessage: 'Sign out' },
	importFile: { defaultMessage: 'Import file…' },
	// account menu
	getHelp: { defaultMessage: 'User manual' },
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

export function TlaSidebarUserLink() {
	const app = useApp()
	const isSignedIn = useAuth().isSignedIn

	const accountMenuLbl = useMsg(messages.accountMenu)

	const user = useValue('auth', () => app.getUser(), [app])
	if (!user) return null

	return (
		<div className={classNames(styles.user)}>
			<TldrawUiDropdownMenuRoot id={`user-menu-sidebar`}>
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<button
							className={classNames(styles.userButton, styles.hoverable)}
							title={accountMenuLbl}
							data-testid="tla-sidebar-user-link"
						>
							<TlaAvatar img={user.avatar} />
							<div className={classNames(styles.userName, 'notranslate')}>{user.name}</div>
						</button>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent
						className="tla-account-menu"
						side="bottom"
						align="end"
						alignOffset={0}
						sideOffset={4}
					>
						<TldrawUiMenuGroup id="files">
							<ImportFileActionItem />
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id="preferences">
							<ColorThemeSubmenu />
							<LanguageMenu />
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id="settings-and-rare-actions">
							<DebugMenuGroup />
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id="signout">
							<SignOutMenuItem />
						</TldrawUiMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
			<TldrawUiDropdownMenuRoot id={`account-menu-sidebar`}>
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<div
							data-testid="tla-sidebar-app-menu"
							className={classNames(styles.accountMenuTrigger, styles.hoverable)}
						>
							<TlaIcon icon="question" />
						</div>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent
						className="tla-account-menu"
						side="bottom"
						align="end"
						alignOffset={0}
						sideOffset={4}
					>
						<TlaSignedInHelpMenuItems />
						<TldrawUiMenuGroup id="links">
							<LegalSummaryMenuItem />
							{isSignedIn && <CookieConsentMenuItem />}
						</TldrawUiMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}

function SignOutMenuItem() {
	const auth = useAuth()

	const trackEvent = useTldrawAppUiEvents()

	const label = useMsg(messages.signOut)

	const handleSignout = useCallback(() => {
		auth.signOut().then(clearLocalSessionState)
		trackEvent('sign-out-clicked', { source: 'sidebar' })
	}, [auth, trackEvent])

	if (!auth.isSignedIn) return
	return (
		<TldrawUiMenuGroup id="account-actions">
			<TldrawUiMenuItem id="sign-out" label={label} readonlyOk onSelect={handleSignout} />
		</TldrawUiMenuGroup>
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

export function LegalSummaryMenuItem() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="tos"
			label={useMsg(messages.legalSummary)}
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

function DebugMenuGroup() {
	const maybeEditor = useMaybeEditor()
	const isDebugMode = useValue('debug', () => maybeEditor?.getInstanceState().isDebugMode, [
		maybeEditor,
	])
	if (!isDebugMode) return null

	return <DebugSubmenu />
}

function DebugSubmenu() {
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

export function TlaSignedInHelpMenuItems() {
	return (
		<TldrawUiMenuGroup id="signed-in-help">
			<UserManualMenuItem />
			<GiveUsFeedbackMenuItem />
		</TldrawUiMenuGroup>
	)
}
