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
import { useRaw } from '../../hooks/useRaw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { TlaTabsPage, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaExportTab } from './Tabs/TlaExportTab'
import { TlaInviteTab } from './Tabs/TlaInviteTab'
import { TlaPublishTab } from './Tabs/TlaPublishTab'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({
	fileId,
	source,
	isAnonUser,
	children,
}: {
	fileId: string
	source: string
	isAnonUser?: boolean
	children: ReactNode
}) {
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const shareMenuActiveTab = useValue(
		'share menu active tab',
		() => getLocalSessionState().shareMenuActiveTab,
		[]
	)

	const isOwner = useIsFileOwner(fileId)
	const file = useValue('file', () => app?.getFile(fileId), [app])
	const isPublished = !!file?.published

	const handleTabChange = useCallback(
		(value: 'share' | 'export' | 'publish') => {
			updateLocalSessionState(() => ({ shareMenuActiveTab: value }))
			trackEvent('change-share-menu-tab', { tab: value, source: 'file-share-menu' })
		},
		[trackEvent]
	)

	const showPublishTab = file && (isOwner || isPublished)
	// This handles the case when a non owner is on the publish tab and the owner unpublishes it
	if (!showPublishTab && shareMenuActiveTab === 'publish') {
		handleTabChange('share')
	}

	return (
		<TldrawUiDropdownMenuRoot id={`share-${fileId}-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.shareMenu}
					side="bottom"
					align={isAnonUser ? 'start' : 'end'}
					alignOffset={isAnonUser ? 2 : -2}
					sideOffset={4}
				>
					{app ? (
						<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
							<TlaTabsTabs>
								<TlaTabsTab id="share">{raw('Invite')}</TlaTabsTab>
								<TlaTabsTab id="export">{raw('Export')}</TlaTabsTab>
								{showPublishTab && <TlaTabsTab id="publish">{raw('Publish')}</TlaTabsTab>}
							</TlaTabsTabs>
							<TlaTabsPage id="share">
								<TlaInviteTab fileId={fileId} />
							</TlaTabsPage>
							<TlaTabsPage id="export">
								<TlaExportTab />
							</TlaTabsPage>
							{showPublishTab && (
								<TlaTabsPage id="publish">
									<TlaPublishTab file={file} />
								</TlaTabsPage>
							)}
						</TlaTabsRoot>
					) : (
						<TlaExportTab />
					)}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
