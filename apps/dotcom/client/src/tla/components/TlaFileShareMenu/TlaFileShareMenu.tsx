import { ReactNode, useCallback } from 'react'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	preventDefault,
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
	context: 'file' | 'published-file' | 'scratch' | 'legacy'
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

	const okTabs = {
		// If the context is a guest file or published file, show the anon share file
		'anon-share':
			!isOwner && (context === 'file' || context === 'published-file' || context === 'legacy'),
		export: true,
		// Can the current user configure the file's sharing settings?
		share: context === 'file' && fileId && file && isOwner,
		// Can the current user configure the file's publishing settings?
		publish: context === 'file' && fileId && file && isOwner,
	}

	// If the user is not signed in and their local active tab is share, then show the anon share tab
	if (tabToShowAsActive === 'share' && !okTabs.share) {
		tabToShowAsActive = 'anon-share'
	}

	// If we're on a tab that we're not allowed to be on, then switch to the first tab we're allowed to be on
	if (!okTabs[tabToShowAsActive]) {
		tabToShowAsActive = 'export'
	}

	// todo: replace disabled tabs for signed out users with "sign in to do X" content

	return (
		<div onPointerDown={preventDefault}>
			<TldrawUiPopover id={`share-${fileId}-${source}`}>
				<TldrawUiPopoverTrigger>{children}</TldrawUiPopoverTrigger>
				<TldrawUiPopoverContent side="bottom" align="end" alignOffset={-2} sideOffset={4}>
					<div className={styles.shareMenu}>
						<TlaTabsRoot activeTab={tabToShowAsActive} onTabChange={handleTabChange}>
							<TlaTabsTabs>
								{/* Disable share when on a scratchpad file */}
								{okTabs.share && (
									<TlaTabsTab id="share" data-testid="tla-share-tab-button-share">
										<F defaultMessage="Invite" />
									</TlaTabsTab>
								)}
								{okTabs['anon-share'] && (
									<TlaTabsTab id="anon-share" data-testid="tla-share-tab-button-anon-share">
										<F defaultMessage="Share" />
									</TlaTabsTab>
								)}
								{/* Always show export */}
								<TlaTabsTab id="export" data-testid="tla-share-tab-button-export">
									<F defaultMessage="Export" />
								</TlaTabsTab>
								{/* Show publish tab when there's a file and either the context is a published file or the user owns the file */}
								{okTabs.publish && (
									<TlaTabsTab id="publish" data-testid="tla-share-tab-button-publish">
										<F defaultMessage="Publish" />
									</TlaTabsTab>
								)}
							</TlaTabsTabs>
							{okTabs.share && fileId && (
								// We have a file and we're authenticated
								<TlaTabsPage id="share" data-testid="tla-share-tab-page-share">
									<TlaInviteTab fileId={fileId} />
								</TlaTabsPage>
							)}
							{okTabs['anon-share'] && (
								<TlaTabsPage id="anon-share" data-testid="tla-share-tab-page-anon-share">
									<TlaAnonCopyLinkTab />
								</TlaTabsPage>
							)}
							<TlaTabsPage id="export" data-testid="tla-share-tab-page-export">
								<TlaExportTab />
							</TlaTabsPage>
							{/* Only show the publish tab if the file is owned by the user */}
							{okTabs.publish && file && (
								<TlaTabsPage id="publish" data-testid="tla-share-tab-page-publish">
									<TlaPublishTab file={file} />
								</TlaTabsPage>
							)}
						</TlaTabsRoot>
					</div>
				</TldrawUiPopoverContent>
			</TldrawUiPopover>
		</div>
	)
}
