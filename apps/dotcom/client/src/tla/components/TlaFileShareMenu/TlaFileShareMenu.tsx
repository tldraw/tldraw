import { TldrawAppFileId, TldrawAppSessionState } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import { TlaPublishPage } from './TlaPublishPage'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({
	fileId,
	source,
	isAnonUser,
	children,
}: {
	fileId: TldrawAppFileId
	source: string
	isAnonUser?: boolean
	children: ReactNode
}) {
	const { fileSlug } = useParams()
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()
	const [snapshotSlug, setSnapshotSlug] = useState<string | null>(null)
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

	useEffect(() => {
		async function getSnapshots() {
			if (!fileSlug) return
			const result = await fetch(`/api/app/snapshots/${fileSlug}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			if (!result.ok) {
				console.log('error fetching snapshots')
			}
			const data = await result.json()
			if (data && data.snapshots?.length) {
				setSnapshotSlug(data.snapshots[0].id)
			}
		}
		getSnapshots()
	}, [fileSlug])

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
								<TlaTabsTab id="publish">{raw('Publish')}</TlaTabsTab>
							</TlaTabsTabs>
							<TlaTabsPage id="share">
								<TlaShareMenuSharePage fileId={fileId} />
							</TlaTabsPage>
							<TlaTabsPage id="export">
								<TlaShareMenuExportPage />
							</TlaTabsPage>
							<TlaTabsPage id="publish">
								<TlaPublishPage snapshotSlug={snapshotSlug} setSnapshotSlug={setSnapshotSlug} />
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
