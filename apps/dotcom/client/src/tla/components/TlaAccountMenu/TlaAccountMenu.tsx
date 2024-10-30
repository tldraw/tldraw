import { useAuth } from '@clerk/clerk-react'
import { ReactNode, useCallback } from 'react'
import {
	PreferencesGroup,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useValue,
} from 'tldraw'
import { Links } from '../../../components/Links'
import { globalEditor } from '../../../utils/globalEditor'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'

export function TlaAccountMenu({
	children,
	source,
}: {
	children: ReactNode
	source: TLAppUiEventSource
}) {
	const auth = useAuth()
	const trackEvent = useTldrawAppUiEvents()
	const handleSignout = useCallback(() => {
		auth.signOut()
		trackEvent('sign-out-clicked', { source })
	}, [auth, trackEvent, source])

	const currentEditor = useValue('editor', () => globalEditor.get(), [])

	return (
		<TldrawUiDropdownMenuRoot id={`account-menu-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={0}>
					<TldrawUiMenuGroup id="account-actions">
						<TldrawUiMenuItem label="Sign out" id="sign-out" onSelect={handleSignout} />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="account-links">
						<TldrawUiMenuSubmenu id="help" label="menu.help">
							<Links />
						</TldrawUiMenuSubmenu>
					</TldrawUiMenuGroup>
					{currentEditor && <PreferencesGroup />}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
