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
	isPublished,
	source,
	children,
}: {
	isPublished?: boolean
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

	const isScratch = !fileId

	let tabToShowAsActive = shareMenuActiveTab

	const showPublish = isOwner || isPublished

	if (
		(tabToShowAsActive === 'share' && (isScratch || !file)) ||
		(tabToShowAsActive === 'publish' && !showPublish)
	) {
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
					align="end"
					alignOffset={-2}
					sideOffset={4}
				>
					<TlaTabsRoot activeTab={tabToShowAsActive} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							{/* Disable share when on a scratchpad file */}
							{!file || isPublished ? null : (
								<TlaTabsTab id="share" disabled={isScratch}>
									<F defaultMessage="Invite" />
								</TlaTabsTab>
							)}
							{/* Always show export */}
							<TlaTabsTab id="export">
								<F defaultMessage="Export" />
							</TlaTabsTab>
							{/* Show publish tab when there's a file and either the file is published or the user owns the file */}
							<TlaTabsTab id="publish" disabled={!showPublish}>
								<F defaultMessage="Publish" />
							</TlaTabsTab>
						</TlaTabsTabs>
						{isScratch ? null : app ? (
							// We have a file / published file and we're authenticated
							<TlaTabsPage id="share">
								<TlaInviteTab fileId={fileId} />
							</TlaTabsPage>
						) : (
							// We have a file / published file but we're NOT authenticated
							<TlaTabsPage id="share">
								<TlaAnonCopyLinkTab />
							</TlaTabsPage>
						)}
						{/* Always show export tab */}
						<TlaTabsPage id="export">
							<TlaExportTab />
						</TlaTabsPage>
						{file && isOwner ? (
							<TlaTabsPage id="publish">
								<TlaPublishTab file={file} />
							</TlaTabsPage>
						) : isPublished ? (
							<TlaTabsPage id="publish">
								<TlaAnonCopyLinkTab />
							</TlaTabsPage>
						) : null}
					</TlaTabsRoot>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
