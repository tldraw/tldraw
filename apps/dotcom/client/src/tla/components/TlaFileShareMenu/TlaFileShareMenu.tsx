import { ReactNode, useCallback } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { TldrawAppSessionState } from '../../utils/schema/TldrawAppSessionState'
import { TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
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
	const app = useApp()

	const shareMenuActiveTab = useValue(
		'share menu active tab',
		() => app.getSessionState().shareMenuActiveTab,
		[app]
	)

	const handleTabChange = useCallback(
		(value: TldrawAppSessionState['shareMenuActiveTab']) => app.setShareMenuActiveTab(value),
		[app]
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
					sideOffset={6}
				>
					<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							<TlaTabsTab id="share">Invite</TlaTabsTab>
							<TlaTabsTab id="export">Export</TlaTabsTab>
						</TlaTabsTabs>
						<TlaShareMenuSharePage fileId={fileId} />
						<TlaShareMenuExportPage />
					</TlaTabsRoot>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
