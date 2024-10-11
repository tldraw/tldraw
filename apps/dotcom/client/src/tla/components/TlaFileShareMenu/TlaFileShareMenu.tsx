import { TldrawAppFileId, TldrawAppSessionState } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { TlaTabsPage, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaShareMenuExportPage } from './TlaFileShareMenuExportPage'
import { TlaShareMenuSharePage } from './TlaFileShareMenuSharePage'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({
	fileId,
	source,
	children,
}: {
	fileId: TldrawAppFileId
	source: string
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

	const handleTabChange = useCallback(
		(value: TldrawAppSessionState['shareMenuActiveTab']) => {
			updateLocalSessionState(() => ({ shareMenuActiveTab: value }))
			trackEvent('change-share-menu-tab', { tab: value, source: 'file-share-menu' })
		},
		[trackEvent]
	)

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
					{app ? (
						<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
							<TlaTabsTabs>
								<TlaTabsTab id="share">{raw('Invite')}</TlaTabsTab>
								<TlaTabsTab id="export">{raw('Export')}</TlaTabsTab>
							</TlaTabsTabs>
							<TlaTabsPage id="share">
								<TlaShareMenuSharePage fileId={fileId} />
							</TlaTabsPage>
							<TlaTabsPage id="export">
								<TlaShareMenuExportPage />
							</TlaTabsPage>
						</TlaTabsRoot>
					) : (
						<TlaShareMenuExportPage />
					)}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
