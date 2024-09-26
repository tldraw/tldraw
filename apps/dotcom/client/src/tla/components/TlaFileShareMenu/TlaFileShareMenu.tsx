import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import { useCallback, useState } from 'react'
import { TldrawUiDropdownMenuTrigger, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { TldrawAppSessionState } from '../../utils/schema/TldrawAppSessionState'
import { TlaIcon } from '../TlaIcon'
import { TlaTabsPages, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaShareMenuExportPage } from './TlaFileShareMenuExportPage'
import { TlaShareMenuSharePage } from './TlaFileShareMenuSharePage'
import { tlaFileShareMenuHelpContext } from './file-share-menu-primitives'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()

	const [showingHelp, setShowingHelp] = useState(false)

	const handleHelpClick = useCallback(() => {
		setShowingHelp((v) => !v)
	}, [])

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
		<DropdownPrimitive.Root dir="ltr" modal={false} open>
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
				<tlaFileShareMenuHelpContext.Provider value={showingHelp}>
					<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							<TlaTabsTab id="share">Share</TlaTabsTab>
							<TlaTabsTab id="export">Export</TlaTabsTab>
							<button
								className={styles.helpButton}
								onClick={handleHelpClick}
								data-active={showingHelp}
							>
								<TlaIcon icon="question-circle" />
							</button>
						</TlaTabsTabs>
						<TlaTabsPages>
							<TlaShareMenuSharePage fileId={fileId} />
							<TlaShareMenuExportPage />
						</TlaTabsPages>
					</TlaTabsRoot>
				</tlaFileShareMenuHelpContext.Provider>
			</DropdownPrimitive.Content>
		</DropdownPrimitive.Root>
	)
}
