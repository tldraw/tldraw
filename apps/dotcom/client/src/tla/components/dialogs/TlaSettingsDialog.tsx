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
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useColorThemeOptions, useSelectColorTheme } from '../../hooks/useColorThemes'
import { useSignOut } from '../../hooks/useSignOut'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getLocalSessionState, setColorThemePreview } from '../../utils/local-session-state'
import { TlaMenuSelect } from '../tla-menu/tla-menu'
import styles from './TlaSettingsDialog.module.css'

const messages = defineMessages({
	profile: { defaultMessage: 'Profile' },
	preferences: { defaultMessage: 'Preferences' },
	name: { defaultMessage: 'Name' },
	color: { defaultMessage: 'Color' },
	colorTheme: { defaultMessage: 'Color theme' },
})

function setPreferences(app: TldrawApp, prefs: Partial<TLUserPreferences>) {
	app.tlUser.setUserPreferences({ id: app.userId, ...prefs })
}

type SettingsTab = 'profile' | 'preferences'

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
						{id === 'profile' ? (
							<ProfilePanel onNameChange={handleNameChange} />
						) : (
							<PreferencesPanel />
						)}
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
				<div className={styles.avatar} style={{ backgroundColor: user.color }} aria-hidden>
					{(user.name || user.email).charAt(0).toUpperCase()}
				</div>
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
		</>
	)
}
