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
import { useRaw } from '../../hooks/useRaw'

export function TlaAccountMenu({
	children,
	source,
	align,
}: {
	children: ReactNode
	source: string
	align?: 'end' | 'start' | 'center'
}) {
	const auth = useAuth()
	const maybeEditor = useMaybeEditor()
	const isDebugMode = useValue('debug', () => maybeEditor?.getInstanceState().isDebugMode, [
		maybeEditor,
	])

	const handleSignout = useCallback(() => {
		auth.signOut()
	}, [auth])

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
							<TldrawUiMenuItem label="Sign out" id="sign-out" onSelect={handleSignout} />
						</TldrawUiMenuGroup>
					)}
					<TldrawUiMenuGroup id="account-links">
						<TldrawUiMenuSubmenu id="help" label="menu.help">
							<Links />
						</TldrawUiMenuSubmenu>
					</TldrawUiMenuGroup>
					<PreferencesGroup />
					{isDebugMode && <AppDebugMenu />}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function AppDebugMenu() {
	const raw = useRaw()
	const editor = useMaybeEditor()
	const [shouldHighlightMissing, setShouldHighlightMissing] = useState(false)
	const debugLanguageFlags = [
		{ name: 'langAccented', locale: 'xx-AE' },
		{ name: 'langLongString', locale: 'xx-LS' },
		{ name: 'langHighlightMissing', locale: 'xx-MS' },
	]

	useEffect(() => {
		document.body.classList.toggle('tla-lang-highlight-missing', shouldHighlightMissing)
	}, [shouldHighlightMissing])

	return (
		<TldrawUiMenuGroup id="debug">
			<TldrawUiMenuSubmenu id="debug" label={raw('App debug flags')}>
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
