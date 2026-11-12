import classNames from 'classnames'
import { Tabs as _Tabs, ToggleGroup as _ToggleGroup } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import {
	defaultUserPreferences,
	defineMessages,
	F,
	LANGUAGES,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	TLUiTranslationKey,
	TLUserPreferences,
	USER_COLORS,
	useDialogs,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { isDevelopmentEnv } from '../../../utils/env'
import { globalEditor } from '../../../utils/globalEditor'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useColorThemeOptions, useSelectColorTheme } from '../../hooks/useColorThemes'
import { useSignOut } from '../../hooks/useSignOut'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getLocalSessionState, setColorThemePreview } from '../../utils/local-session-state'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import { TlaMenuSelect, TlaMenuSwitch } from '../tla-menu/tla-menu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaUserAvatar } from '../TlaUserAvatar/TlaUserAvatar'
import { SubmitFeedbackDialog } from './SubmitFeedbackDialog'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'
import styles from './TlaSettingsDialog.module.css'

const messages = defineMessages({
	profile: { defaultMessage: 'Profile' },
	preferences: { defaultMessage: 'Preferences' },
	about: { defaultMessage: 'About' },
	name: { defaultMessage: 'Name' },
	color: { defaultMessage: 'Color' },
	colorTheme: { defaultMessage: 'Color theme' },
	cookies: { defaultMessage: 'Cookies' },
	manageCookies: { defaultMessage: 'Manage cookies' },
	langHighlightMissing: { defaultMessage: 'i18n: Highlight Missing' },
	userManual: { defaultMessage: 'User manual' },
	submitFeedback: { defaultMessage: 'Send feedback' },
	legalSummary: { defaultMessage: 'Legal summary' },
	buildWithTldraw: { defaultMessage: 'Build with the tldraw SDK' },
})

const USER_MANUAL_URL = 'https://tldraw.notion.site/support'
const LEGAL_SUMMARY_URL = '/legal.html'
const DOT_DEV_URL =
	'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'

function setPreferences(app: TldrawApp, prefs: Partial<TLUserPreferences>) {
	app.tlUser.setUserPreferences({ id: app.userId, ...prefs })
}

type SettingsTab = 'profile' | 'preferences' | 'about'

export function TlaSettingsDialog() {
	const msg = useTranslation()
	const app = useApp()
	const trackAppEvent = useTldrawAppUiEvents()
	const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
	const signOut = useSignOut('user-preferences')

	// Lives here, not in ProfilePanel: Radix unmounts inactive tab content, so a panel-level
	// effect would report once per visit to the tab instead of once per dialog.
	const typedNameRef = useRef<string | null>(null)
	useEffect(() => {
		const initialName = app.getUser().name
		return () => {
			if (typedNameRef.current !== null && typedNameRef.current !== initialName) {
				trackAppEvent('change-user-name', { source: 'user-preferences' })
			}
		}
	}, [app, trackAppEvent])
	const handleNameChange = (name: string) => {
		typedNameRef.current = name
		setPreferences(app, { name })
	}

	const tabs: { id: SettingsTab; label: string }[] = [
		{ id: 'profile', label: msg(messages.profile) },
		{ id: 'preferences', label: msg(messages.preferences) },
		{ id: 'about', label: msg(messages.about) },
	]

	return (
		<div className={styles.dialog}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Settings" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<_Tabs.Root
				className={styles.layout}
				orientation="vertical"
				value={activeTab}
				onValueChange={(tab) => setActiveTab(tab as SettingsTab)}
			>
				<div className={styles.nav}>
					<_Tabs.List className={styles.tabs}>
						{tabs.map(({ id, label }) => (
							<_Tabs.Trigger
								key={id}
								value={id}
								data-testid={`tla-settings-tab-${id}`}
								className={classNames(styles.tab, 'tla-text_ui__regular')}
							>
								{label}
							</_Tabs.Trigger>
						))}
					</_Tabs.List>
					<button
						className={classNames(styles.tab, styles.signOut, 'tla-text_ui__regular')}
						data-testid="tla-settings-sign-out"
						onClick={signOut}
					>
						<F defaultMessage="Sign out" />
					</button>
				</div>
				{tabs.map(({ id, label }) => (
					<_Tabs.Content key={id} value={id} className={styles.panel}>
						<h3 className={styles.panelTitle}>{label}</h3>
						{id === 'profile' && <ProfilePanel onNameChange={handleNameChange} />}
						{id === 'preferences' && <PreferencesPanel />}
						{id === 'about' && <AboutPanel />}
					</_Tabs.Content>
				))}
			</_Tabs.Root>
		</div>
	)
}

function ProfilePanel({ onNameChange }: { onNameChange(name: string): void }) {
	const msg = useTranslation()
	const app = useApp()
	const trackUiEvent = useUiEvents()
	const user = useValue('user', () => app.getUser(), [app])

	return (
		<>
			<div className={styles.identity}>
				<TlaUserAvatar user={user} className={styles.avatar} />
				<div className={styles.identityText}>
					<div className="tla-text_ui__medium notranslate">{user.name}</div>
					<div className={classNames(styles.email, 'notranslate')}>{user.email}</div>
				</div>
			</div>
			<div className={styles.field}>
				<div className={styles.label}>{msg(messages.name)}</div>
				<TldrawUiInput
					aria-label={msg(messages.name)}
					data-testid="tla-settings-name-input"
					className={styles.input}
					defaultValue={user.name}
					onValueChange={onNameChange}
				/>
			</div>
			<div className={styles.field}>
				<div className={styles.label} id="tla-settings-color-label">
					{msg(messages.color)}
				</div>
				<div
					className={styles.swatches}
					role="radiogroup"
					aria-labelledby="tla-settings-color-label"
				>
					{USER_COLORS.map((color) => (
						<button
							key={color}
							role="radio"
							aria-checked={user.color === color}
							aria-label={color}
							title={color}
							data-testid={`tla-settings-color-${color}`}
							className={styles.swatch}
							style={{ backgroundColor: color }}
							onClick={() => {
								if (user.color === color) return
								setPreferences(app, { color })
								trackUiEvent('set-color', { source: 'dialog' })
							}}
						/>
					))}
				</div>
			</div>
		</>
	)
}

const COLOR_SCHEMES: {
	value: NonNullable<TLUserPreferences['colorScheme']>
	label: TLUiTranslationKey
}[] = [
	{ value: 'light', label: 'theme.light' },
	{ value: 'dark', label: 'theme.dark' },
	{ value: 'system', label: 'theme.system' },
]

function PreferencesPanel() {
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackUiEvent = useUiEvents()
	const colorThemeOptions = useColorThemeOptions()
	const selectColorTheme = useSelectColorTheme()

	const colorScheme = useValue(
		'colorScheme',
		() => app.getUser().colorScheme ?? defaultUserPreferences.colorScheme,
		[app]
	)
	const locale = useValue('locale', () => app.getUser().locale ?? defaultUserPreferences.locale, [
		app,
	])
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])

	useEffect(() => () => setColorThemePreview(null), [])

	const languageOptions = LANGUAGES.map(({ locale, label }) => ({ value: locale, label }))

	return (
		<>
			<div className={styles.field}>
				<div className={styles.label} id="tla-settings-theme-label">
					{msg('menu.theme')}
				</div>
				<_ToggleGroup.Root
					type="single"
					className={styles.segmented}
					aria-labelledby="tla-settings-theme-label"
					value={colorScheme}
					onValueChange={(value: NonNullable<TLUserPreferences['colorScheme']> | '') => {
						// Clicking the active segment emits '' (deselect); a theme must stay selected.
						if (!value) return
						setPreferences(app, { colorScheme: value })
						trackUiEvent('color-scheme', { source: 'dialog', value })
					}}
				>
					{COLOR_SCHEMES.map(({ value, label }) => (
						<_ToggleGroup.Item
							key={value}
							value={value}
							data-testid={`tla-settings-theme-${value}`}
							className={classNames(styles.segment, 'tla-text_ui__regular')}
						>
							{msg(label)}
						</_ToggleGroup.Item>
					))}
				</_ToggleGroup.Root>
			</div>
			<div className={styles.field}>
				<label htmlFor="tla-settings-color-theme" className={styles.label}>
					{msg(messages.colorTheme)}
				</label>
				<TlaMenuSelect
					id="tla-settings-color-theme"
					data-testid="tla-settings-color-theme"
					variant="field"
					label={colorThemeOptions.find((o) => o.value === colorTheme)?.label ?? colorTheme}
					value={colorTheme}
					options={colorThemeOptions}
					onHighlight={(id) => setColorThemePreview(id)}
					onChange={selectColorTheme}
				/>
			</div>
			<div className={styles.field}>
				<label htmlFor="tla-settings-language" className={styles.label}>
					{msg('menu.language')}
				</label>
				<TlaMenuSelect
					id="tla-settings-language"
					data-testid="tla-settings-language"
					variant="field"
					label={languageOptions.find((o) => o.value === locale)?.label ?? locale}
					value={locale}
					options={languageOptions}
					onChange={(locale) => {
						setPreferences(app, { locale })
						trackUiEvent('change-language', { source: 'dialog', locale })
					}}
				/>
			</div>
			<div className={styles.field}>
				<div className={styles.label}>{msg(messages.cookies)}</div>
				<div className={styles.rows}>
					<button
						className={classNames(styles.row, 'tla-text_ui__regular')}
						data-testid="tla-settings-manage-cookies"
						onClick={() => addDialog({ component: () => <TlaManageCookiesDialog /> })}
					>
						{msg(messages.manageCookies)}
					</button>
				</div>
			</div>
			<HighlightMissingTranslationsField />
		</>
	)
}

function HighlightMissingTranslationsField() {
	const msg = useTranslation()
	const isDebugMode = useValue(
		'debug',
		() => globalEditor.get()?.getInstanceState().isDebugMode ?? false,
		[]
	)
	const [isHighlighting, setIsHighlighting] = useState(() =>
		document.body.classList.contains('tla-lang-highlight-missing')
	)

	// An internal developer tool, so local development only: not staging or preview deploys,
	// and not production users who turn on debug mode.
	if (!isDevelopmentEnv || !isDebugMode) return null

	return (
		<div className={classNames(styles.field, styles.switchField)}>
			<label htmlFor="tla-settings-highlight-missing" className={styles.label}>
				{msg(messages.langHighlightMissing)}
			</label>
			{/* Shadows every string the UI rendered without going through `F`, which is what
			    marks translated text with `.i18n-msg`. Not a locale — a body class. */}
			<TlaMenuSwitch
				id="tla-settings-highlight-missing"
				checked={isHighlighting}
				onChange={(checked) => {
					document.body.classList.toggle('tla-lang-highlight-missing', checked)
					setIsHighlighting(checked)
				}}
			/>
		</div>
	)
}

function AboutPanel() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const openAndTrack = useOpenUrlAndTrack('dialog')
	const rowClassName = classNames(styles.row, 'tla-text_ui__regular')

	return (
		<div className={styles.rows}>
			<button
				className={rowClassName}
				data-testid="tla-settings-user-manual"
				onClick={() => openAndTrack(USER_MANUAL_URL)}
			>
				{msg(messages.userManual)}
				<TlaIcon icon="external" />
			</button>
			<button
				className={rowClassName}
				data-testid="tla-settings-feedback"
				onClick={() => addDialog({ component: SubmitFeedbackDialog })}
			>
				{msg(messages.submitFeedback)}
			</button>
			<button
				className={rowClassName}
				data-testid="tla-settings-legal-summary"
				onClick={() => openAndTrack(LEGAL_SUMMARY_URL)}
			>
				{msg(messages.legalSummary)}
				<TlaIcon icon="external" />
			</button>
			<ExternalLink
				className={rowClassName}
				to={DOT_DEV_URL}
				data-testid="tla-settings-dotdev-link"
				eventName="sidebar-dotdev-link-clicked"
			>
				{msg(messages.buildWithTldraw)}
				<TlaIcon icon="external" />
			</ExternalLink>
		</div>
	)
}
