import classNames from 'classnames'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
} from 'tldraw'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
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
})

export function TlaSidebarHelpMenu() {
	const msg = useMsg(messages.help)
	return (
		<TldrawUiDropdownMenuRoot id={`help-menu-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button
						title={msg}
						data-testid="tla-sidebar-help-menu-trigger"
						className={classNames(styles.sidebarHelpMenuTrigger, styles.hoverable)}
					>
						<TlaIcon icon="question" />
					</button>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={10}>
					<TldrawUiMenuGroup id="support">
						<UserManualMenuItem />
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
