import { ReactNode, useCallback } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { TlaTabsPage, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaAnonCopyLinkTab } from './Tabs/TlaAnonCopyLinkTab'
import { TlaExportTab } from './Tabs/TlaExportTab'
import { TlaInviteTab } from './Tabs/TlaInviteTab'
import { TlaPublishTab } from './Tabs/TlaPublishTab'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({
	fileId,
	context,
	source,
	children,
}: {
	// this share menu is shown when viewing a file, or a published file (snapshot), or when the logged out user is on the root (the scratchpad)
	context: 'file' | 'published-file' | 'scratch'
	fileId?: string
	source: string
	children: ReactNode
}) {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const shareMenuActiveTab = useValue(
		'share menu active tab',
		() => getLocalSessionState().shareMenuActiveTab,
		[]
	)

	const isOwner = useIsFileOwner(fileId)

	const file = useValue('file', () => app?.getFile(fileId), [app])

	const handleTabChange = useCallback(
		(value: 'share' | 'export' | 'publish') => {
			updateLocalSessionState(() => ({ shareMenuActiveTab: value }))
			trackEvent('change-share-menu-tab', { tab: value, source: 'file-share-menu' })
		},
		[trackEvent]
	)

	let tabToShowAsActive = shareMenuActiveTab

	// Can the current user configure the file's sharing settings?
	const hasSharePermissions = context === 'file' && fileId && file && isOwner

	// Can the current user configure the file's publishing settings?
	const hasPublishPermissions = context === 'file' && fileId && file && isOwner

	// If the context is a guest file or published file, show the anon share file
	const showAnonShareTab = !hasSharePermissions && context !== 'scratch'

	// If we're on a tab that we're not allowed to be on, then switch to the first tab we're allowed to be on
	if (showAnonShareTab && tabToShowAsActive !== 'export' && tabToShowAsActive !== 'anon-share') {
		tabToShowAsActive = 'export'
	}

	// todo: replace disabled tabs for signed out users with "sign in to do X" content

	return (
		<TldrawUiDropdownMenuRoot id={`share-${fileId}-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.shareMenu}
					side="bottom"
					alignOffset={-2}
					sideOffset={4}
				>
					<TlaTabsRoot activeTab={tabToShowAsActive} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							{/* Disable share when on a scratchpad file */}
							{hasSharePermissions && (
								<TlaTabsTab id="share">
									<F defaultMessage="Invite" />
								</TlaTabsTab>
							)}
							{showAnonShareTab && (
								<TlaTabsTab id="anon-share">
									<F defaultMessage="Share" />
								</TlaTabsTab>
							)}
							{/* Always show export */}
							<TlaTabsTab id="export">
								<F defaultMessage="Export" />
							</TlaTabsTab>
							{/* Show publish tab when there's a file and either the context is a published file or the user owns the file */}
							{hasPublishPermissions && (
								<TlaTabsTab id="publish">
									<F defaultMessage="Publish" />
								</TlaTabsTab>
							)}
						</TlaTabsTabs>
						{hasSharePermissions && (
							// We have a file and we're authenticated
							<TlaTabsPage id="share">
								<TlaInviteTab fileId={fileId} />
							</TlaTabsPage>
						)}
						{showAnonShareTab && (
							<TlaTabsPage id="anon-share">
								<TlaAnonCopyLinkTab />
							</TlaTabsPage>
						)}
						<TlaTabsPage id="export">
							<TlaExportTab />
						</TlaTabsPage>
						{/* Only show the publish tab if the file is owned by the user */}
						{hasPublishPermissions && (
							<TlaTabsPage id="publish">
								<TlaPublishTab file={file} />
							</TlaTabsPage>
						)}
					</TlaTabsRoot>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
