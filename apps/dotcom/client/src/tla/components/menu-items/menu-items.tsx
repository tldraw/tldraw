import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ColorSchemeMenu,
	TLDRAW_FILE_EXTENSION,
	TldrawUiIcon,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useDirection,
	useMaybeEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../routeDefs'
import { signoutAnalytics } from '../../../utils/analytics'
import { useMaybeApp } from '../../hooks/useAppState'
import { UI_THEMES } from '../../themes/ui-themes'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { defineMessages, useMsg } from '../../utils/i18n'
import {
	getLocalSessionState,
	resetLocalSessionStateButKeepTheme,
	setColorThemePreview,
	updateLocalSessionState,
} from '../../utils/local-session-state'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	// user menu
	accountMenu: { defaultMessage: 'User settings' },
	signOut: { defaultMessage: 'Sign out' },
	importFile: { defaultMessage: 'Import file…' },
	dotdev: { defaultMessage: 'Try the tldraw SDK' },
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

export function SignOutMenuItem() {
	const auth = useAuth()

	const trackEvent = useTldrawAppUiEvents()

	const label = useMsg(messages.signOut)

	const handleSignout = useCallback(() => {
		signoutAnalytics()
		auth.signOut().then(resetLocalSessionStateButKeepTheme)
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

const THEME_NAMES: Record<string, string> = {
	default: 'Default',
	...Object.fromEntries(UI_THEMES.map(({ id, name }) => [id, name])),
}

function UIThemeMenuCheckboxItem({
	checked,
	label,
	onPreview,
	onSelect,
}: {
	checked: boolean
	label: string
	onPreview(): void
	onSelect(): void
}) {
	const dir = useDirection()
	const msg = useTranslation()

	return (
		<_DropdownMenu.CheckboxItem
			dir={dir}
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			title={label}
			checked={checked}
			onPointerEnter={(e) => {
				if (e.pointerType !== 'touch') onPreview()
			}}
			onSelect={(e) => {
				onSelect()
				e.preventDefault()
			}}
		>
			<TldrawUiIcon
				small
				label={msg(checked ? 'ui.checked' : 'ui.unchecked')}
				icon={checked ? 'check' : 'none'}
			/>
			<span className="tlui-button__label" draggable={false}>
				{label}
			</span>
		</_DropdownMenu.CheckboxItem>
	)
}

export function UIThemeSubmenu() {
	const editor = useMaybeEditor()
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const trackEvent = useTldrawAppUiEvents()
	const clearThemePreview = useCallback(() => setColorThemePreview(null), [])

	const themeIds = useValue('themeIds', () => (editor ? Object.keys(editor.getThemes()) : []), [
		editor,
	])

	useEffect(() => clearThemePreview, [clearThemePreview])

	if (!editor || themeIds.length === 0) return null

	return (
		<TldrawUiMenuSubmenu id="ui-theme" label="menu.color-theme">
			<div
				className="tlui-menu__group"
				onPointerCancel={clearThemePreview}
				onPointerLeave={clearThemePreview}
			>
				{themeIds.map((id) => (
					<UIThemeMenuCheckboxItem
						key={id}
						label={THEME_NAMES[id] ?? id}
						checked={colorTheme === id}
						onPreview={() => setColorThemePreview(id)}
						onSelect={() => {
							updateLocalSessionState(() => ({ colorTheme: id }))
							clearThemePreview()
							trackEvent('set-color-theme', {
								source: 'user-preferences',
								theme: id,
							})
						}}
					/>
				))}
			</div>
		</TldrawUiMenuSubmenu>
	)
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
