import { useAuth } from '@clerk/clerk-react'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
	PreferencesGroup,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useMaybeEditor,
	useValue,
} from 'tldraw'
import { Links } from '../../../components/Links'
import { globalEditor } from '../../../utils/globalEditor'
import { defineMessages, useIntl } from '../../app/i18n'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'

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
	const auth = useAuth()
	const maybeEditor = useMaybeEditor()
	const isDebugMode = useValue('debug', () => maybeEditor?.getInstanceState().isDebugMode, [
		maybeEditor,
	])
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()

	const handleSignout = useCallback(() => {
		auth.signOut()
		trackEvent('sign-out-clicked', { source })
	}, [auth, trackEvent, source])

	const currentEditor = useValue('editor', () => globalEditor.get(), [])

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
					{auth.isSignedIn && (
						<TldrawUiMenuGroup id="account-actions">
							<TldrawUiMenuItem
								id="sign-out"
								label={intl.formatMessage(messages.signOut)}
								onSelect={handleSignout}
							/>
						</TldrawUiMenuGroup>
					)}
					<TldrawUiMenuGroup id="account-links">
						<TldrawUiMenuSubmenu id="help" label={intl.formatMessage(messages.help)}>
							<Links />
						</TldrawUiMenuSubmenu>
					</TldrawUiMenuGroup>
					{currentEditor && <PreferencesGroup />}
					{isDebugMode && <AppDebugMenu />}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function AppDebugMenu() {
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
		<TldrawUiMenuGroup id="debug">
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
		</TldrawUiMenuGroup>
	)
}
