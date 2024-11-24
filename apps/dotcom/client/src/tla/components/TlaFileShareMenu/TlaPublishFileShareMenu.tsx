import { ReactNode, useCallback, useState } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import { TlaTabsPage, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import { TlaMenuControlGroup, TlaMenuSection } from '../tla-menu/tla-menu'
import { TlaExportTab } from './Tabs/TlaExportTab'
import { TlaCopyPublishLinkButton } from './Tabs/TlaPublishTab'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenuPublishPage({
	isAnonUser,
	children,
}: {
	isAnonUser?: boolean
	children: ReactNode
}) {
	const trackEvent = useTldrawAppUiEvents()

	const url = `${window.location.origin}${window.location.pathname}`

	const [activeTab, setActiveTab] = useState<'export' | 'publish'>('publish')

	const handleTabChange = useCallback(
		(value: 'share' | 'export' | 'publish') => {
			if (value === 'share') return // not here buddy
			setActiveTab(value)
			trackEvent('change-share-menu-tab', { tab: value, source: 'file-share-menu' })
		},
		[trackEvent]
	)

	return (
		<TldrawUiDropdownMenuRoot id={`share-published`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.shareMenu}
					side="bottom"
					align="end"
					alignOffset={-2}
					sideOffset={4}
				>
					<TlaTabsRoot activeTab={activeTab} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							{isAnonUser ? null : (
								<TlaTabsTab id="share" disabled>
									<F defaultMessage="Fork" />
								</TlaTabsTab>
							)}
							<TlaTabsTab id="export">
								<F defaultMessage="Export" />
							</TlaTabsTab>
							<TlaTabsTab id="publish">
								<F defaultMessage="Publish" />
							</TlaTabsTab>
						</TlaTabsTabs>
						<TlaTabsPage id="export">
							<TlaExportTab />
						</TlaTabsPage>
						<TlaTabsPage id="publish">
							{/* <TlaPublishTab file={file} /> */}
							<TlaMenuSection>
								<TlaMenuControlGroup>
									<TlaCopyPublishLinkButton url={url} />
								</TlaMenuControlGroup>
							</TlaMenuSection>
						</TlaTabsPage>
					</TlaTabsRoot>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
