import classNames from 'classnames'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
} from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useWhatsNew } from '../../../hooks/useWhatsNew'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { TlaWhatsNewDialog } from '../../dialogs/TlaWhatsNewDialog'
import {
	CookieConsentMenuItem,
	DotDevMenuItem,
	GiveUsFeedbackMenuItem,
	LegalSummaryMenuItem,
	UserManualMenuItem,
} from '../../menu-items/menu-items'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	whatsNew: { defaultMessage: "What's new" },
})

export function TlaSidebarHelpMenu() {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const helpLbl = useMsg(messages.help)
	const whatsNewLbl = useMsg(messages.whatsNew)
	const { entries } = useWhatsNew()

	const latestVersion = entries[0]?.version

	const handleWhatsNewClick = () => {
		trackEvent('open-whats-new-dialog', { source: 'sidebar' })
		if (latestVersion) {
			app.z.mutate.user.updateWhatsNewSeenVersion({ version: latestVersion })
		}
		addDialog({ component: TlaWhatsNewDialog })
	}

	return (
		<TldrawUiDropdownMenuRoot id={`help-menu-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button
						title={helpLbl}
						data-testid="tla-sidebar-help-menu-trigger"
						className={classNames(styles.sidebarHelpMenuTrigger, styles.hoverable)}
					>
						<TlaIcon icon="question" />
					</button>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={10}>
					<TldrawUiMenuGroup id="support">
						<UserManualMenuItem />
						{entries.length > 0 && (
							<TldrawUiMenuItem
								id="whats-new"
								label={whatsNewLbl}
								iconLeft="info"
								onSelect={handleWhatsNewClick}
								readonlyOk
							/>
						)}
						<GiveUsFeedbackMenuItem />
						<DotDevMenuItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="legal">
						<LegalSummaryMenuItem />
						<CookieConsentMenuItem />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
