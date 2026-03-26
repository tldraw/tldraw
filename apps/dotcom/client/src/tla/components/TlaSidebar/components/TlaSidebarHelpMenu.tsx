import classNames from 'classnames'
import {
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
} from 'tldraw'
import { defineMessages, useMsg } from '../../../utils/i18n'
import {
	CookieConsentMenuItem,
	DotDevMenuItem,
	GiveUsFeedbackMenuItem,
	LegalSummaryMenuItem,
	UserManualMenuItem,
} from '../../menu-items/menu-items'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
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
					<TldrawUiButton
						type="icon"
						tooltip={msg}
						title={msg}
						data-testid="tla-sidebar-help-menu-trigger"
						className={classNames(styles.sidebarHelpMenuTrigger, styles.hoverable)}
					>
						<TlaIcon icon="question" />
					</TldrawUiButton>
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
