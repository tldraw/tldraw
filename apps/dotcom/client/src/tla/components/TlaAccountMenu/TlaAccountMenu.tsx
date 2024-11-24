import { useAuth } from '@clerk/clerk-react'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
	ColorSchemeMenu,
	LanguageMenu,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	TogglePasteAtCursorItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleWrapModeItem,
	useMaybeEditor,
	useValue,
} from 'tldraw'
import { Links } from '../../../components/Links'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, useIntl, useMsg } from '../../utils/i18n'

const messages = defineMessages({
	appDebugFlags: { defaultMessage: 'App debug flags' },
	signOut: { defaultMessage: 'Sign out' },
	help: { defaultMessage: 'Help' },
	langAccented: { defaultMessage: 'i18n: Accented' },
	langLongString: { defaultMessage: 'i18n: Long String' },
	langHighlightMissing: { defaultMessage: 'i18n: Highlight Missing' },
})

export function TlaAccountMenu({
	children,
	source,
	align,
}: {
	children: ReactNode
	source: TLAppUiEventSource
	align?: 'end' | 'start' | 'center'
}) {
	const maybeEditor = useMaybeEditor()
	const isDebugMode = useValue('debug', () => maybeEditor?.getInstanceState().isDebugMode, [
		maybeEditor,
	])

	return (
		<TldrawUiDropdownMenuRoot id={`account-menu-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className="tla-account-menu"
					side="bottom"
					align={align ?? 'end'}
					alignOffset={0}
					sideOffset={0}
				>
					<TldrawUiMenuGroup id="things-to-do">
						<HelpSubMenu />
						<ColorThemeSubmenu />
						<LanguageMenu />
						{/* <KeyboardShortcutsMenuItem /> */}
						{isDebugMode && <TlaDebugSubmenu />}
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="signout">
						<SignOutMenuItem source={source} />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function ColorThemeSubmenu() {
	return <ColorSchemeMenu />
}

function _PreferencesSubmenu() {
	return (
		<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
			<TldrawUiMenuGroup id="preferences-actions">
				<ToggleSnapModeItem />
				<ToggleToolLockItem />
				<ToggleGridItem />
				<ToggleWrapModeItem />
				<ToggleFocusModeItem />
				<ToggleEdgeScrollingItem />
				<ToggleReduceMotionItem />
				<ToggleDynamicSizeModeItem />
				<TogglePasteAtCursorItem />
				<ToggleDebugModeItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="color-scheme">
				<ColorSchemeMenu />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function HelpSubMenu() {
	const msg = useMsg(messages.help)
	return (
		<TldrawUiMenuSubmenu id="help" label={msg}>
			<Links />
		</TldrawUiMenuSubmenu>
	)
}

function SignOutMenuItem({ source }: { source: TLAppUiEventSource }) {
	const auth = useAuth()

	const trackEvent = useTldrawAppUiEvents()

	const label = useMsg(messages.signOut)

	const handleSignout = useCallback(() => {
		auth.signOut()
		trackEvent('sign-out-clicked', { source })
	}, [auth, trackEvent, source])

	if (!auth.isSignedIn) return
	return (
		<TldrawUiMenuGroup id="account-actions">
			<TldrawUiMenuItem id="sign-out" label={label} readonlyOk onSelect={handleSignout} />
		</TldrawUiMenuGroup>
	)
}

function TlaDebugSubmenu() {
	const editor = useMaybeEditor()
	const intl = useIntl()
	const appFlagsLbl = intl.formatMessage(messages.appDebugFlags)

	const [shouldHighlightMissing, setShouldHighlightMissing] = useState(false)
	const debugLanguageFlags = [
		{ name: intl.formatMessage(messages.langAccented), locale: 'xx-AE' },
		{ name: intl.formatMessage(messages.langLongString), locale: 'xx-LS' },
		{ name: intl.formatMessage(messages.langHighlightMissing), locale: 'xx-MS' },
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
