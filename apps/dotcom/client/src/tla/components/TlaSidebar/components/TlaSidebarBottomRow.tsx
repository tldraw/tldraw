import classNames from 'classnames'
import {
	LanguageMenu,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useValue,
} from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TlaAvatar } from '../../TlaAvatar/TlaAvatar'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import {
	ColorThemeSubmenu,
	CookieConsentMenuItem,
	DebugMenuGroup,
	GiveUsFeedbackMenuItem,
	ImportFileActionItem,
	LegalSummaryMenuItem,
	SignOutMenuItem,
	UserManualMenuItem,
} from '../../menu-items/menu-items'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
	userMenu: { defaultMessage: 'User settings' },
})

export function TlaSidebarBottomRow() {
	return (
		<div className={classNames(styles.sidebarBottomRow)}>
			<UserSettingsMenu />
			<HelpMenu />
		</div>
	)
}

function UserSettingsMenu() {
	const app = useApp()
	const userMenuLbl = useMsg(messages.userMenu)
	const user = useValue('auth', () => app.getUser(), [app])
	if (!user) return null

	return (
		<TldrawUiDropdownMenuRoot id={`user-settings-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button
						className={classNames(styles.userSettingsTrigger, styles.hoverable)}
						title={userMenuLbl}
						data-testid="tla-sidebar-user-settings-trigger"
					>
						<TlaAvatar img={user.avatar} />
						<div className={classNames(styles.userSettingsName, 'notranslate')}>{user.name}</div>
						<div className={styles.userSettingsIcon}>
							<TlaIcon icon="dots-vertical-strong" />
						</div>
					</button>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={4} sideOffset={4}>
					<TldrawUiMenuGroup id="files">
						<ImportFileActionItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="preferences">
						<ColorThemeSubmenu />
						<LanguageMenu />
					</TldrawUiMenuGroup>
					<DebugMenuGroup />
					<TldrawUiMenuGroup id="signout">
						<SignOutMenuItem />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function HelpMenu() {
	return (
		<TldrawUiDropdownMenuRoot id={`help-menu-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<div
						data-testid="tla-sidebar-help-menu"
						className={classNames(styles.helpMenuTrigger, styles.hoverable)}
					>
						<TlaIcon icon="question" />
					</div>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={4}>
					<TldrawUiMenuGroup id="support">
						<UserManualMenuItem />
						<GiveUsFeedbackMenuItem />
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
