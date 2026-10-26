import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	TLDRAW_FILE_EXTENSION,
	TLUiEventSource,
	TldrawUiIcon,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useCommandPaletteActiveItemId,
	useDirection,
	useMaybeEditor,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../routeDefs'
import { signoutAnalytics } from '../../../utils/analytics'
import { isDevelopmentEnv } from '../../../utils/env'
import { useMaybeApp } from '../../hooks/useAppState'
import { UI_THEMES } from '../../themes/ui-themes'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import {
	getLocalSessionState,
	resetLocalSessionStateButKeepTheme,
	setColorThemePreview,
	updateLocalSessionState,
} from '../../utils/local-session-state'
import {
	TLDRAW_OFFLINE_FILE_EXTENSION,
	useRejectTldrawOfflineFiles,
} from '../../utils/tldrawOfflineFiles'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from '../dialogs/TlaManageCookiesDialog'

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
	// color theme
	colorTheme: { defaultMessage: 'Color theme' },
	colorThemeDefault: { defaultMessage: 'Default' },
	// debug
	appDebugFlags: { defaultMessage: 'App debug flags' },
	langHighlightMissing: { defaultMessage: 'i18n: Highlight Missing' },
})

export function SignOutMenuItem({ source = 'sidebar' }: { source?: TLAppUiEventSource } = {}) {
	const msg = useTranslation()
	const auth = useAuth()
	const app = useMaybeApp()

	const trackEvent = useTldrawAppUiEvents()

	const handleSignout = useCallback(() => {
		signoutAnalytics()
		auth
			.signOut()
			.then(async () => {
				resetLocalSessionStateButKeepTheme()
				// After sign-out rather than before: an IndexedDB delete waits for every connection to
				// the database to close, and other tabs only drop theirs once Clerk propagates sign-out.
				await app?.deleteLocalData()
			})
			.catch((err) => console.error('Sign out failed:', err))
		trackEvent('sign-out-clicked', { source })
	}, [auth, app, trackEvent, source])

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

const COLOR_SCHEMES = [
	{ colorScheme: 'light' as const, label: 'theme.light' },
	{ colorScheme: 'dark' as const, label: 'theme.dark' },
	{ colorScheme: 'system' as const, label: 'theme.system' },
]

function ThemeMenuGroup() {
	const editor = useMaybeEditor()
	const trackEvent = useUiEvents()
	const currentColorScheme = useValue(
		'colorScheme',
		() =>
			editor
				? (editor.user.getUserPreferences().colorScheme ??
					(editor.user.getIsDarkMode() ? 'dark' : 'light'))
				: 'system',
		[editor]
	)

	if (!editor) return null

	return (
		<TldrawUiMenuGroup id="theme">
			{COLOR_SCHEMES.map(({ colorScheme, label }) => (
				<TldrawUiMenuCheckboxItem
					id={`color-scheme-${colorScheme}`}
					key={colorScheme}
					label={label}
					checked={colorScheme === currentColorScheme}
					readonlyOk
					onSelect={() => {
						editor.user.updateUserPreferences({ colorScheme })
						trackEvent('color-scheme', { source: 'menu', value: colorScheme })
					}}
				/>
			))}
		</TldrawUiMenuGroup>
	)
}

const THEME_NAMES: Record<string, string> = Object.fromEntries(
	UI_THEMES.map(({ id, name }) => [id, name])
)

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

function useUIThemeIds() {
	const editor = useMaybeEditor()
	return useValue('themeIds', () => (editor ? Object.keys(editor.getThemes()) : []), [editor])
}

function useUIThemeChoices() {
	const themeIds = useUIThemeIds()
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const msg = useTranslation()
	const defaultThemeLabel = msg(messages.colorThemeDefault)
	const trackEvent = useTldrawAppUiEvents()
	return themeIds.map((id) => ({
		id,
		label: id === 'default' ? defaultThemeLabel : (THEME_NAMES[id] ?? id),
		checked: colorTheme === id,
		select(source: TLAppUiEventSource) {
			updateLocalSessionState(() => ({ colorTheme: id }))
			trackEvent('set-color-theme', { source, theme: id })
		},
	}))
}

// Highlighting a color theme previews it, like hovering one in the menu. Closing the palette
// without choosing unmounts this and drops the preview.
function UIThemeCommandPalettePreview({ themeIds }: { themeIds: string[] }) {
	const activeId = useCommandPaletteActiveItemId()
	const themeId = themeIds.find((id) => activeId === `ui-theme-${id}`) ?? null
	useEffect(() => setColorThemePreview(themeId), [themeId])
	useEffect(() => () => setColorThemePreview(null), [])
	return null
}

export function UIThemeCommandPaletteSubmenu() {
	const msg = useTranslation()
	const choices = useUIThemeChoices()
	const colorThemeLabel = msg(messages.colorTheme)
	if (choices.length === 0) return null
	return (
		<TldrawUiMenuSubmenu id="tla-color-theme" label={colorThemeLabel}>
			<UIThemeCommandPalettePreview themeIds={choices.map((choice) => choice.id)} />
			{choices.map((choice) => (
				<TldrawUiMenuCheckboxItem
					key={choice.id}
					id={`ui-theme-${choice.id}`}
					label={choice.label}
					checked={choice.checked}
					readonlyOk
					onSelect={() => choice.select('command-palette')}
				/>
			))}
		</TldrawUiMenuSubmenu>
	)
}

export function UIThemeSubmenu() {
	const msg = useTranslation()
	const themeIds = useUIThemeIds()

	if (themeIds.length === 0) return null

	return (
		<TldrawUiMenuSubmenu id="ui-theme" label={msg(messages.colorTheme)}>
			<UIThemeMenuGroup />
		</TldrawUiMenuSubmenu>
	)
}

function UIThemeMenuGroup() {
	const msg = useTranslation()
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const trackEvent = useTldrawAppUiEvents()
	const clearThemePreview = useCallback(() => setColorThemePreview(null), [])
	const defaultThemeLabel = msg(messages.colorThemeDefault)
	const themeIds = useUIThemeIds()

	useEffect(() => clearThemePreview, [clearThemePreview])

	if (themeIds.length === 0) return null

	return (
		<div
			className="tlui-menu__group"
			onPointerCancel={clearThemePreview}
			onPointerLeave={clearThemePreview}
		>
			{themeIds.map((id) => (
				<UIThemeMenuCheckboxItem
					key={id}
					label={id === 'default' ? defaultThemeLabel : (THEME_NAMES[id] ?? id)}
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
	)
}

export function ThemeSubmenu() {
	const editor = useMaybeEditor()
	if (!editor) return null

	return (
		<TldrawUiMenuSubmenu id="theme" label="menu.theme">
			<div className="tlui-language-menu">
				<ThemeMenuGroup />
				<UIThemeMenuGroup />
			</div>
		</TldrawUiMenuSubmenu>
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

export function UserManualMenuItem({
	icon = true,
	source = 'main-menu',
}: {
	icon?: boolean
	source?: TLUiEventSource
} = {}) {
	const msg = useTranslation()
	const openAndTrack = useOpenUrlAndTrack(source)
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

export function ImportFileActionItem({
	source = 'file-menu',
}: { source?: TLAppUiEventSource } = {}) {
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

				trackEvent('import-tldr-file', { source })

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
						source,
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
