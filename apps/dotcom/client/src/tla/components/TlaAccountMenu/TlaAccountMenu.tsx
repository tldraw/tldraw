import { useAuth } from '@clerk/clerk-react'
import { ReactNode, useCallback } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from 'tldraw'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../utils/i18n'
import { clearLocalSessionState } from '../../utils/local-session-state'
import { TlaAppMenuGroup } from '../TlaAppMenuGroup/TlaAppMenuGroup'

const messages = defineMessages({
	signOut: { defaultMessage: 'Sign out' },
})

export function TlaAccountMenu({
	children,
	source,
}: {
	children: ReactNode
	source: TLAppUiEventSource
}) {
	return (
		<TldrawUiDropdownMenuRoot id={`account-menu-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className="tla-account-menu"
					side="bottom"
					align="end"
					alignOffset={0}
					sideOffset={4}
				>
					<TlaAppMenuGroup />
					<TldrawUiMenuGroup id="signout">
						<SignOutMenuItem source={source} />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function SignOutMenuItem({ source }: { source: TLAppUiEventSource }) {
	const auth = useAuth()

	const trackEvent = useTldrawAppUiEvents()

	const label = useMsg(messages.signOut)

	const handleSignout = useCallback(() => {
		auth.signOut().then(clearLocalSessionState)
		trackEvent('sign-out-clicked', { source })
	}, [auth, trackEvent, source])

	if (!auth.isSignedIn) return
	return (
		<TldrawUiMenuGroup id="account-actions">
			<TldrawUiMenuItem id="sign-out" label={label} readonlyOk onSelect={handleSignout} />
		</TldrawUiMenuGroup>
	)
}
