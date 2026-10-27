import { useAuth } from '@clerk/react'
import { fileOpen } from 'browser-fs-access'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
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
import { isDevelopmentEnv } from '../../../utils/env'
import { useMaybeApp } from '../../hooks/useAppState'
import { useColorThemeOptions, useSelectColorTheme } from '../../hooks/useColorThemes'
import { useSignOut } from '../../hooks/useSignOut'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { getLocalSessionState, setColorThemePreview } from '../../utils/local-session-state'
import {
	TLDRAW_OFFLINE_FILE_EXTENSION,
	useRejectTldrawOfflineFiles,
} from '../../utils/tldrawOfflineFiles'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'
import { TlaSettingsDialog } from '../dialogs/TlaSettingsDialog'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	// user menu
	accountMenu: { defaultMessage: 'User settings' },
	signOut: { defaultMessage: 'Sign out' },
	settings: { defaultMessage: 'Settings' },
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
	// color theme
	colorTheme: { defaultMessage: 'Color theme' },
	// debug
	appDebugFlags: { defaultMessage: 'App debug flags' },
	langHighlightMissing: { defaultMessage: 'i18n: Highlight Missing' },
})

export function SignOutMenuItem() {
	const msg = useTranslation()
	const auth = useAuth()
	const handleSignout = useSignOut('sidebar')

	if (!auth.isSignedIn) return
	return (
		<TldrawUiMenuGroup id="account-actions">
			<TldrawUiMenuItem
				id="sign-out"
				data-testid="tla-user-sign-out"
				onSelect={handleSignout}
				label={msg(messages.signOut)}
				readonlyOk
			/>
		</TldrawUiMenuGroup>
	)
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
	const msg = useTranslation()

	return (
		<TldrawUiMenuSubmenu id="ui-theme" label={msg(messages.colorTheme)}>
			<UIThemeMenuGroup />
		</TldrawUiMenuSubmenu>
	)
}

function UIThemeMenuGroup() {
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const clearThemePreview = useCallback(() => setColorThemePreview(null), [])
	const options = useColorThemeOptions()
	const selectColorTheme = useSelectColorTheme()

	useEffect(() => clearThemePreview, [clearThemePreview])

	return (
		<div
			className="tlui-menu__group"
			onPointerCancel={clearThemePreview}
			onPointerLeave={clearThemePreview}
		>
			{options.map(({ value, label }) => (
				<UIThemeMenuCheckboxItem
					key={value}
					label={label}
					checked={colorTheme === value}
					onPreview={() => setColorThemePreview(value)}
					onSelect={() => selectColorTheme(value)}
				/>
			))}
		</div>
	)
}

export function SettingsMenuItem() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="settings"
			label={msg(messages.settings)}
			readonlyOk
			onSelect={() => {
				addDialog({ component: () => <TlaSettingsDialog /> })
			}}
		/>
	)
}

export function CookieConsentMenuItem() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="cookie-consent"
			label={msg(messages.manageCookies)}
			readonlyOk
			onSelect={() => {
				addDialog({ component: () => <TlaManageCookiesDialog /> })
			}}
		/>
	)
}

export function UserManualMenuItem({ icon = true }: { icon?: boolean } = {}) {
	const msg = useTranslation()
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="user-manual"
			label={msg(messages.getHelp)}
			iconLeft={icon ? 'manual' : undefined}
			readonlyOk
			onSelect={() => {
				openAndTrack('https://tldraw.notion.site/support')
			}}
		/>
	)
}

export function GiveUsFeedbackMenuItem() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<TldrawUiMenuItem
			id="give-us-feedback"
			label={msg(messages.submitFeedback)}
			iconLeft="comment"
			readonlyOk
			onSelect={() => {
				addDialog({ component: SubmitFeedbackDialog })
			}}
		/>
	)
}

export function LegalSummaryMenuItem() {
	const msg = useTranslation()
	const openAndTrack = useOpenUrlAndTrack('main-menu')
	return (
		<TldrawUiMenuItem
			id="tos"
			label={msg(messages.legalSummary)}
			readonlyOk
			onSelect={() => {
				openAndTrack('/legal.html')
			}}
		/>
	)
}

export function ImportFileActionItem() {
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const navigate = useNavigate()

	const rejectTldrawOfflineFiles = useRejectTldrawOfflineFiles()

	return (
		<TldrawUiMenuItem
			id="import-file"
			label={msg(messages.importFile)}
			readonlyOk
			onSelect={async () => {
				const editor = getCurrentEditor()
				if (!editor) return
				if (!app) return

				trackEvent('import-tldr-file', { source: 'file-menu' })

				try {
					// tldraw offline files are selectable so that we can explain why we can't open them
					// yet. Leaving them out of the picker would just grey them out with no explanation.
					const pickedFiles = await fileOpen({
						extensions: [TLDRAW_FILE_EXTENSION, TLDRAW_OFFLINE_FILE_EXTENSION],
						multiple: true,
						description: 'tldraw project',
					})

					const tldrawFiles = rejectTldrawOfflineFiles(pickedFiles)
					if (!tldrawFiles.length) return

					app.uploadTldrFiles(tldrawFiles, {
						source: 'file-menu',
						onFirstFileUploaded: (fileId) => {
							navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
						},
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
	// These are internal developer tools, so only surface them in local development —
	// not on staging/preview deploys or to production users who enable debug mode.
	if (!isDevelopmentEnv || !isDebugMode) return null

	return <DebugSubmenu />
}

export function DebugSubmenu() {
	const msg = useTranslation()

	const [shouldHighlightMissing, setShouldHighlightMissing] = useState(
		document.body.classList.contains('tla-lang-highlight-missing')
	)

	useEffect(() => {
		document.body.classList.toggle('tla-lang-highlight-missing', shouldHighlightMissing)
	}, [shouldHighlightMissing])

	const highlightMissingLbl = msg(messages.langHighlightMissing)

	return (
		<TldrawUiMenuSubmenu id="debug" label={msg(messages.appDebugFlags)}>
			<TldrawUiMenuGroup id="debug app flags">
				{/* Shadows every string the UI rendered without going through `F`, which is what
				    marks translated text with `.i18n-msg`. Not a locale — a body class. */}
				<TldrawUiMenuCheckboxItem
					id="highlight-missing"
					title={highlightMissingLbl}
					label={highlightMissingLbl}
					checked={shouldHighlightMissing}
					onSelect={() => setShouldHighlightMissing(!shouldHighlightMissing)}
				/>
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
