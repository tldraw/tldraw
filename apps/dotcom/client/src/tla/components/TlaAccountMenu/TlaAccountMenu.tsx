import { useAuth } from '@clerk/clerk-react'
import { fileOpen } from 'browser-fs-access'
import { ReactNode, useCallback } from 'react'
import {
	TLDRAW_FILE_EXTENSION,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	deleteFromLocalStorage,
} from 'tldraw'
import { tlaProbablyLoggedInFlag } from '../../../routes'
import { useMaybeApp } from '../../hooks/useAppState'
import { getSnapshotsFromDroppedTldrawFiles } from '../../hooks/useTldrFileDrop'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
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
					alignOffset={0}
					sideOffset={4}
				>
					<TlaAppActionsGroup />
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
		deleteFromLocalStorage(tlaProbablyLoggedInFlag)
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

function TlaAppActionsGroup() {
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()
	const app = useMaybeApp()

	return (
		<TldrawUiMenuGroup id="app-actions">
			<TldrawUiMenuItem
				id="about"
				label="help-menu.import-tldr-file"
				icon="import"
				readonlyOk
				onSelect={async () => {
					const editor = getCurrentEditor()
					if (!editor) return
					if (!app) return

					trackEvent('import-tldr-file', { source: 'account-menu' })

					try {
						const tldrawFiles = await fileOpen({
							extensions: [TLDRAW_FILE_EXTENSION],
							multiple: true,
							description: 'tldraw project',
						})

						if (tldrawFiles.length > 0) {
							const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
							if (!snapshots.length) return
							const token = await auth.getToken()
							if (!token) return
							await app.createFilesFromTldrFiles(snapshots, token)
						}
					} catch {
						// user cancelled
						return
					}
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
