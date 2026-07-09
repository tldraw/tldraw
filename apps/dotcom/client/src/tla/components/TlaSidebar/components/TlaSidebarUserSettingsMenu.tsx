import {
	TlButton,
	TlDropdownMenuContent,
	TlDropdownMenuRoot,
	TlDropdownMenuTrigger,
} from '@tldraw/ui'
import classNames from 'classnames'
import {
	LanguageMenu,
	preventDefault,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useMenuIsOpen,
	useValue,
} from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import {
	CookieConsentMenuItem,
	DebugMenuGroup,
	ImportFileActionItem,
	LegalSummaryMenuItem,
	SignOutMenuItem,
	ThemeSubmenu,
	UserManualMenuItem,
} from '../../menu-items/menu-items'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	userMenu: { defaultMessage: 'User settings' },
})

const USER_SETTINGS_MENU_ID = 'user-settings-sidebar'

export function TlaUserSettingsMenu() {
	const app = useApp()
	const userMenuLbl = useMsg(messages.userMenu)
	const user = useValue('auth', () => app.getUser(), [app])

	// The dropdown's open state is keyed globally by its id, so we can reuse the
	// same hook to open the menu when the user right-clicks the row.
	const [, onMenuOpenChange] = useMenuIsOpen(USER_SETTINGS_MENU_ID)

	return (
		<TlDropdownMenuRoot id={USER_SETTINGS_MENU_ID}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TlDropdownMenuTrigger>
					<TlButton
						type="menu"
						tooltip={userMenuLbl}
						title={userMenuLbl}
						className={classNames(styles.sidebarUserSettingsTrigger, styles.hoverable)}
						data-testid="tla-sidebar-user-settings-trigger"
						onContextMenu={(e) => {
							preventDefault(e)
							onMenuOpenChange(true)
						}}
					>
						<TlaIcon icon="avatar" className={styles.sidebarUserSettingsAvatarIcon} />
						<div
							className={classNames(
								styles.sidebarUserSettingsName,
								'tla-text_ui__regular',
								'notranslate'
							)}
						>
							{user?.name || <F defaultMessage="Account" />}
						</div>
						<div className={styles.sidebarUserSettingsIcon}>
							<TlaIcon icon="help-circle" />
						</div>
					</TlButton>
				</TlDropdownMenuTrigger>
				{/* Hang ~8px over the sidebar's right edge (see TlaFileMenu) rather than inset. */}
				<TlDropdownMenuContent side="bottom" align="end" {...TLA_MENU_POSITION} alignOffset={-18}>
					{user && (
						<>
							<TldrawUiMenuGroup id="files">
								<ImportFileActionItem />
							</TldrawUiMenuGroup>
							<TldrawUiMenuGroup id="preferences">
								<ThemeSubmenu />
								<LanguageMenu />
							</TldrawUiMenuGroup>
							<DebugMenuGroup />
						</>
					)}
					<TldrawUiMenuGroup id="legal">
						<UserManualMenuItem icon={false} />
						<LegalSummaryMenuItem />
						<CookieConsentMenuItem />
					</TldrawUiMenuGroup>
					{user && (
						<TldrawUiMenuGroup id="signout">
							<SignOutMenuItem />
						</TldrawUiMenuGroup>
					)}
				</TlDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TlDropdownMenuRoot>
	)
}
