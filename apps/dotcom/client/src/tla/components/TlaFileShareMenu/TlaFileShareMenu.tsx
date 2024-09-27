import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import { useCallback } from 'react'
import { TldrawUiDropdownMenuTrigger, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { TldrawAppSessionState } from '../../utils/schema/TldrawAppSessionState'
import { TlaTabsPages, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaShareMenuExportPage } from './TlaFileShareMenuExportPage'
import { TlaShareMenuSharePage } from './TlaFileShareMenuSharePage'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({ fileId }: { fileId: TldrawAppFileId }) {
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
		<DropdownPrimitive.Root dir="ltr" modal={true}>
			<TldrawUiDropdownMenuTrigger>
				<button className={classNames('tla-button', 'tla-button__primary', 'tla-text_ui__medium')}>
					<span>Share</span>
				</button>
			</TldrawUiDropdownMenuTrigger>
			<DropdownPrimitive.Content
				className={classNames('tlui-menu', 'tla-text_ui__medium', styles.shareMenu)}
				data-size="large"
				side="bottom"
				align="end"
				collisionPadding={6}
				alignOffset={-2}
				sideOffset={6}
			>
				<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
					<TlaTabsTabs>
						<TlaTabsTab id="share">Invite</TlaTabsTab>
						<TlaTabsTab id="export">Export</TlaTabsTab>
					</TlaTabsTabs>
					<TlaTabsPages>
						<TlaShareMenuSharePage fileId={fileId} />
						<TlaShareMenuExportPage />
					</TlaTabsPages>
				</TlaTabsRoot>
			</DropdownPrimitive.Content>
		</DropdownPrimitive.Root>
	)
}
