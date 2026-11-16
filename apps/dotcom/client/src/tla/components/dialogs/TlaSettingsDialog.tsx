import classNames from 'classnames'
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
import { DesignSwitch, designSwitches, useDesignSwitch } from '../../utils/designSwitches'
import { getLocalSessionState, setColorThemePreview } from '../../utils/local-session-state'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
	TlaMenuSelect,
	TlaMenuSwitch,
	TlaMenuTabsPage,
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../tla-menu/tla-menu'
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
	canvas: { defaultMessage: 'Canvas' },
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

type SettingsTab = 'profile' | 'preferences' | 'canvas' | 'accessibility' | 'labs' | 'about'

export function TlaSettingsDialog() {
	const msg = useTranslation()
	const app = useApp()
	const trackAppEvent = useTldrawAppUiEvents()
	const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
	const hasVerticalTabs = useDesignSwitch('settingsVerticalTabs')
	const hasLabsTab = useDesignSwitch('settingsLabsTab')

	// Lives here, not in ProfilePanel: inactive tab pages unmount, so a panel-level effect
	// would report once per visit to the tab instead of once per dialog.
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
		{ id: 'canvas', label: msg(messages.canvas) },
		{ id: 'accessibility', label: msg('menu.accessibility') },
		// A plain string, like the design switch labels: not worth translating while it's an experiment.
		...(hasLabsTab ? [{ id: 'labs' as const, label: 'Labs' }] : []),
		{ id: 'about', label: msg(messages.about) },
	]
	// Turning the Labs tab off from inside it removes the tab that's open.
	const visibleTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'profile'

	const pages = tabs.map(({ id }) => (
		<TlaMenuTabsPage key={id} id={id} className={styles.page}>
			{id === 'profile' && (
				// With vertical tabs, Sign out sits at the bottom of the tab column instead.
				<ProfilePanel onNameChange={handleNameChange} hasSignOut={!hasVerticalTabs} />
			)}
			{id === 'preferences' && <PreferencesPanel />}
			{id === 'canvas' && <CanvasPanel />}
			{id === 'accessibility' && <AccessibilityPanel />}
			{id === 'labs' && <LabsPanel />}
			{id === 'about' && <AboutPanel />}
		</TlaMenuTabsPage>
	))

	return (
		<div
			className={classNames(
				styles.dialog,
				hasVerticalTabs ? styles.dialogVertical : hasLabsTab && styles.dialogSixTabs
			)}
		>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Settings" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TlaMenuTabsRoot
				activeTab={visibleTab}
				onTabChange={(tab) => setActiveTab(tab as SettingsTab)}
			>
				{hasVerticalTabs ? (
					<div className={styles.columns}>
						<div className={styles.nav}>
							<div className={styles.navTabs} role="tablist" aria-orientation="vertical">
								{tabs.map(({ id, label }) => (
									<button
										key={id}
										role="tab"
										aria-selected={visibleTab === id}
										aria-controls={`tla-tabpanel-${id}`}
										data-testid={`tla-settings-tab-${id}`}
										className={classNames(styles.navTab, 'tla-text_ui__medium')}
										onClick={() => setActiveTab(id)}
									>
										{label}
									</button>
								))}
							</div>
							<SignOutButton layout="nav" />
						</div>
						{pages}
					</div>
				) : (
					<>
						<div className={styles.tabs}>
							<TlaMenuTabsTabs>
								{tabs.map(({ id, label }) => (
									<TlaMenuTabsTab key={id} id={id} data-testid={`tla-settings-tab-${id}`}>
										{label}
									</TlaMenuTabsTab>
								))}
							</TlaMenuTabsTabs>
						</div>
						{pages}
					</>
				)}
			</TlaMenuTabsRoot>
		</div>
	)
}

/** Sign out as an item in the vertical tab column, or as a row on the Profile page. */
function SignOutButton({ layout }: { layout: 'nav' | 'row' }) {
	const signOut = useSignOut('user-preferences')
	const icon = <TlaIcon icon="sign-out" />
	const label = <F defaultMessage="Sign out" />
	return (
		<button
			className={classNames(
				layout === 'nav' ? [styles.navTab, styles.navSignOut] : [styles.link, styles.signOut],
				'tla-text_ui__medium'
			)}
			data-testid="tla-settings-sign-out"
			onClick={signOut}
		>
			{layout === 'nav' ? icon : label}
			{layout === 'nav' ? label : icon}
		</button>
	)
}

function ProfilePanel({
	onNameChange,
	hasSignOut,
}: {
	onNameChange(name: string): void
	hasSignOut: boolean
}) {
	const msg = useTranslation()
	const app = useApp()
	const trackUiEvent = useUiEvents()
	const user = useValue('user', () => app.getUser(), [app])

	return (
		<TlaMenuSection>
			<div className={styles.identity}>
				<TlaUserAvatar user={user} className={styles.avatar} />
				<div className={styles.identityText}>
					<div className="tla-text_ui__medium notranslate">{user.name}</div>
					<div className={classNames(styles.email, 'notranslate')}>{user.email}</div>
				</div>
			</div>
			<TlaMenuControlGroup>
				<TlaMenuControl>
					<TlaMenuControlLabel>{msg(messages.name)}</TlaMenuControlLabel>
					<div className={styles.nameField}>
						<TldrawUiInput
							aria-label={msg(messages.name)}
							data-testid="tla-settings-name-input"
							className={styles.input}
							defaultValue={user.name}
							onValueChange={onNameChange}
						/>
					</div>
				</TlaMenuControl>
				<TlaMenuControl>
					<TlaMenuControlLabel>{msg(messages.color)}</TlaMenuControlLabel>
					<div className={styles.swatches} role="radiogroup" aria-label={msg(messages.color)}>
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
				</TlaMenuControl>
			</TlaMenuControlGroup>
			{hasSignOut && (
				<TlaMenuControlGroup>
					<TlaMenuControl>
						<SignOutButton layout="row" />
					</TlaMenuControl>
				</TlaMenuControlGroup>
			)}
		</TlaMenuSection>
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

	// The user record stores this as a plain string, so narrow it to a scheme we offer.
	const colorScheme = useValue(
		'colorScheme',
		() => {
			const value = app.getUser().colorScheme
			return (
				COLOR_SCHEMES.find((o) => o.value === value)?.value ?? defaultUserPreferences.colorScheme
			)
		},
		[app]
	)
	const locale = useValue('locale', () => app.getUser().locale ?? defaultUserPreferences.locale, [
		app,
	])
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])

	useEffect(() => () => setColorThemePreview(null), [])

	const languageOptions = LANGUAGES.map(({ locale, label }) => ({ value: locale, label }))

	const colorSchemeOptions = COLOR_SCHEMES.map(({ value, label }) => ({ value, label: msg(label) }))

	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				<TlaMenuControl>
					<TlaMenuControlLabel htmlFor="tla-settings-theme">
						{msg('menu.theme')}
					</TlaMenuControlLabel>
					<TlaMenuSelect
						id="tla-settings-theme"
						data-testid="tla-settings-theme"
						label={colorSchemeOptions.find((o) => o.value === colorScheme)?.label ?? colorScheme}
						value={colorScheme}
						options={colorSchemeOptions}
						onChange={(value) => {
							setPreferences(app, { colorScheme: value })
							trackUiEvent('color-scheme', { source: 'dialog', value })
						}}
					/>
				</TlaMenuControl>
				<TlaMenuControl>
					<TlaMenuControlLabel htmlFor="tla-settings-color-theme">
						{msg(messages.colorTheme)}
					</TlaMenuControlLabel>
					<TlaMenuSelect
						id="tla-settings-color-theme"
						data-testid="tla-settings-color-theme"
						label={colorThemeOptions.find((o) => o.value === colorTheme)?.label ?? colorTheme}
						value={colorTheme}
						options={colorThemeOptions}
						onHighlight={(id) => setColorThemePreview(id)}
						onChange={selectColorTheme}
					/>
				</TlaMenuControl>
				<TlaMenuControl>
					<TlaMenuControlLabel htmlFor="tla-settings-language">
						{msg('menu.language')}
					</TlaMenuControlLabel>
					<TlaMenuSelect
						id="tla-settings-language"
						data-testid="tla-settings-language"
						label={languageOptions.find((o) => o.value === locale)?.label ?? locale}
						value={locale}
						options={languageOptions}
						onChange={(locale) => {
							setPreferences(app, { locale })
							trackUiEvent('change-language', { source: 'dialog', locale })
						}}
					/>
				</TlaMenuControl>
				<HighlightMissingTranslationsControl />
			</TlaMenuControlGroup>
			<TlaMenuControlGroup>
				<TlaMenuControl>
					<button
						className={classNames(styles.link, 'tla-text_ui__medium')}
						data-testid="tla-settings-manage-cookies"
						onClick={() => addDialog({ component: () => <TlaManageCookiesDialog /> })}
					>
						{msg(messages.manageCookies)}
						<TlaIcon icon="chevron-right" className={styles.linkIcon} />
					</button>
				</TlaMenuControl>
			</TlaMenuControlGroup>
		</TlaMenuSection>
	)
}

/** The editor preferences the switches read, with tldraw's defaults for any the user hasn't set. */
function usePreferences() {
	const app = useApp()
	return useValue(
		'preferences',
		() => {
			const user = app.getUser()
			return {
				isSnapMode: user.isSnapMode ?? defaultUserPreferences.isSnapMode,
				isWrapMode: user.isWrapMode ?? defaultUserPreferences.isWrapMode,
				edgeScrollSpeed: user.edgeScrollSpeed ?? defaultUserPreferences.edgeScrollSpeed,
				isDynamicSizeMode: user.isDynamicSizeMode ?? defaultUserPreferences.isDynamicSizeMode,
				isPasteAtCursorMode: user.isPasteAtCursorMode ?? defaultUserPreferences.isPasteAtCursorMode,
				animationSpeed: user.animationSpeed ?? defaultUserPreferences.animationSpeed,
				areKeyboardShortcutsEnabled:
					user.areKeyboardShortcutsEnabled ?? defaultUserPreferences.areKeyboardShortcutsEnabled,
				enhancedA11yMode: user.enhancedA11yMode ?? defaultUserPreferences.enhancedA11yMode,
				inputMode: user.inputMode ?? defaultUserPreferences.inputMode,
				isZoomDirectionInverted:
					user.isZoomDirectionInverted ?? defaultUserPreferences.isZoomDirectionInverted,
			}
		},
		[app]
	)
}

type Preferences = ReturnType<typeof usePreferences>

interface PreferenceToggle {
	/** The UI event the editor's own menu item for this preference reports. */
	id:
		| 'toggle-snap-mode'
		| 'toggle-wrap-mode'
		| 'toggle-edge-scrolling'
		| 'toggle-dynamic-size-mode'
		| 'toggle-paste-at-cursor'
		| 'toggle-reduce-motion'
		| 'toggle-keyboard-shortcuts'
		| 'enhanced-a11y-mode'
		| 'toggle-invert-zoom'
	label: TLUiTranslationKey
	isChecked(preferences: Preferences): boolean
	getUpdate(checked: boolean): Partial<TLUserPreferences>
	isDisabled?(preferences: Preferences): boolean
}

const CANVAS_TOGGLES: PreferenceToggle[] = [
	{
		id: 'toggle-snap-mode',
		label: 'action.toggle-snap-mode.menu',
		isChecked: (preferences) => preferences.isSnapMode,
		getUpdate: (isSnapMode) => ({ isSnapMode }),
	},
	{
		id: 'toggle-wrap-mode',
		label: 'action.toggle-wrap-mode.menu',
		isChecked: (preferences) => preferences.isWrapMode,
		getUpdate: (isWrapMode) => ({ isWrapMode }),
	},
	{
		id: 'toggle-edge-scrolling',
		label: 'action.toggle-edge-scrolling.menu',
		isChecked: (preferences) => preferences.edgeScrollSpeed !== 0,
		getUpdate: (checked) => ({ edgeScrollSpeed: checked ? 1 : 0 }),
	},
	{
		id: 'toggle-dynamic-size-mode',
		label: 'action.toggle-dynamic-size-mode.menu',
		isChecked: (preferences) => preferences.isDynamicSizeMode,
		getUpdate: (isDynamicSizeMode) => ({ isDynamicSizeMode }),
	},
	{
		id: 'toggle-paste-at-cursor',
		label: 'action.toggle-paste-at-cursor.menu',
		isChecked: (preferences) => preferences.isPasteAtCursorMode,
		getUpdate: (isPasteAtCursorMode) => ({ isPasteAtCursorMode }),
	},
]

const ACCESSIBILITY_TOGGLES: PreferenceToggle[] = [
	{
		id: 'toggle-reduce-motion',
		label: 'action.toggle-reduce-motion.menu',
		isChecked: (preferences) => preferences.animationSpeed === 0,
		getUpdate: (checked) => ({ animationSpeed: checked ? 0 : 1 }),
	},
	{
		id: 'toggle-keyboard-shortcuts',
		label: 'action.toggle-keyboard-shortcuts.menu',
		isChecked: (preferences) => preferences.areKeyboardShortcutsEnabled,
		getUpdate: (areKeyboardShortcutsEnabled) => ({ areKeyboardShortcutsEnabled }),
	},
	{
		id: 'enhanced-a11y-mode',
		label: 'action.enhanced-a11y-mode.menu',
		isChecked: (preferences) => preferences.enhancedA11yMode,
		getUpdate: (enhancedA11yMode) => ({ enhancedA11yMode }),
	},
]

const INPUT_DEVICE_TOGGLES: PreferenceToggle[] = [
	{
		id: 'toggle-invert-zoom',
		label: 'action.toggle-invert-zoom.menu',
		isChecked: (preferences) => preferences.isZoomDirectionInverted,
		getUpdate: (isZoomDirectionInverted) => ({ isZoomDirectionInverted }),
		isDisabled: (preferences) => preferences.inputMode !== 'mouse',
	},
]

function PreferenceSwitches({ toggles }: { toggles: PreferenceToggle[] }) {
	const msg = useTranslation()
	const app = useApp()
	const trackUiEvent = useUiEvents()
	const preferences = usePreferences()

	return (
		<>
			{toggles.map((toggle) => {
				const id = `tla-settings-${toggle.id}`
				return (
					<TlaMenuControl key={toggle.id}>
						<TlaMenuControlLabel htmlFor={id}>{msg(toggle.label)}</TlaMenuControlLabel>
						<TlaMenuSwitch
							id={id}
							data-testid={id}
							checked={toggle.isChecked(preferences)}
							disabled={toggle.isDisabled?.(preferences) ?? false}
							onChange={(checked) => {
								setPreferences(app, toggle.getUpdate(checked))
								trackUiEvent(toggle.id, { source: 'dialog' })
							}}
						/>
					</TlaMenuControl>
				)
			})}
		</>
	)
}

function CanvasPanel() {
	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				<PreferenceSwitches toggles={CANVAS_TOGGLES} />
			</TlaMenuControlGroup>
			<TlaMenuControlGroup>
				<InputDeviceControl />
				<PreferenceSwitches toggles={INPUT_DEVICE_TOGGLES} />
			</TlaMenuControlGroup>
		</TlaMenuSection>
	)
}

function AccessibilityPanel() {
	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				<PreferenceSwitches toggles={ACCESSIBILITY_TOGGLES} />
			</TlaMenuControlGroup>
		</TlaMenuSection>
	)
}

type InputMode = 'auto' | 'trackpad' | 'mouse'

const AUTO_INPUT_MODE_LABELS: Record<'none' | 'pan' | 'zoom', TLUiTranslationKey> = {
	none: 'action.toggle-auto-none',
	pan: 'action.toggle-auto-pan',
	zoom: 'action.toggle-auto-zoom',
}

function InputDeviceControl() {
	const msg = useTranslation()
	const app = useApp()
	const trackUiEvent = useUiEvents()
	const { inputMode } = usePreferences()
	// What "auto" resolves to comes from the open file's camera, so without an editor it has no suffix.
	const wheelBehavior = useValue(
		'wheelBehavior',
		() => globalEditor.get()?.getCameraOptions().wheelBehavior ?? 'none',
		[]
	)

	const options: { value: InputMode; label: string }[] = [
		{ value: 'auto', label: msg(AUTO_INPUT_MODE_LABELS[wheelBehavior]) },
		{ value: 'trackpad', label: msg('action.toggle-trackpad') },
		{ value: 'mouse', label: msg('action.toggle-mouse') },
	]
	const value: InputMode = inputMode === 'trackpad' || inputMode === 'mouse' ? inputMode : 'auto'

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-settings-input-device">
				{msg('menu.input-device')}
			</TlaMenuControlLabel>
			<TlaMenuSelect
				id="tla-settings-input-device"
				data-testid="tla-settings-input-device"
				label={options.find((o) => o.value === value)?.label ?? value}
				value={value}
				options={options}
				onChange={(mode) => {
					setPreferences(app, { inputMode: mode === 'auto' ? null : mode })
					trackUiEvent('input-mode', { source: 'dialog', value: mode })
				}}
			/>
		</TlaMenuControl>
	)
}

function HighlightMissingTranslationsControl() {
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
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-settings-highlight-missing">
				{msg(messages.langHighlightMissing)}
			</TlaMenuControlLabel>
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
		</TlaMenuControl>
	)
}

function LabsPanel() {
	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				{Object.values(designSwitches).map((designSwitch) => (
					<LabsSwitch key={designSwitch.id} designSwitch={designSwitch} />
				))}
			</TlaMenuControlGroup>
		</TlaMenuSection>
	)
}

function LabsSwitch({ designSwitch }: { designSwitch: DesignSwitch }) {
	const checked = useValue(designSwitch.value)
	const id = `tla-settings-design-switch-${designSwitch.id}`
	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor={id}>{designSwitch.label}</TlaMenuControlLabel>
			<TlaMenuSwitch
				id={id}
				data-testid={id}
				checked={checked}
				onChange={(checked) => designSwitch.value.set(checked)}
			/>
		</TlaMenuControl>
	)
}

function AboutPanel() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const openAndTrack = useOpenUrlAndTrack('dialog')
	const linkClassName = classNames(styles.link, 'tla-text_ui__medium')
	const externalIcon = <TlaIcon icon="external" className={styles.linkIcon} />

	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				<TlaMenuControl>
					<button
						className={linkClassName}
						data-testid="tla-settings-user-manual"
						onClick={() => openAndTrack(USER_MANUAL_URL)}
					>
						{msg(messages.userManual)}
						{externalIcon}
					</button>
				</TlaMenuControl>
				<TlaMenuControl>
					<button
						className={linkClassName}
						data-testid="tla-settings-feedback"
						onClick={() => addDialog({ component: SubmitFeedbackDialog })}
					>
						{msg(messages.submitFeedback)}
						<TlaIcon icon="chevron-right" className={styles.linkIcon} />
					</button>
				</TlaMenuControl>
				<TlaMenuControl>
					<button
						className={linkClassName}
						data-testid="tla-settings-legal-summary"
						onClick={() => openAndTrack(LEGAL_SUMMARY_URL)}
					>
						{msg(messages.legalSummary)}
						{externalIcon}
					</button>
				</TlaMenuControl>
				<TlaMenuControl>
					<ExternalLink
						className={linkClassName}
						to={DOT_DEV_URL}
						data-testid="tla-settings-dotdev-link"
						eventName="sidebar-dotdev-link-clicked"
					>
						{msg(messages.buildWithTldraw)}
						{externalIcon}
					</ExternalLink>
				</TlaMenuControl>
			</TlaMenuControlGroup>
		</TlaMenuSection>
	)
}
