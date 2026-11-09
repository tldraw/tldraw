import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import {
	defineMessages,
	F,
	preventDefault,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useMenuIsOpen,
	useTranslation,
	useValue,
} from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import {
	AppLanguageMenu,
	CookieConsentMenuItem,
	DebugMenuGroup,
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

export function TlaUserSettingsMenu({
	compact = false,
	className,
}: { compact?: boolean; className?: string } = {}) {
	const msg = useTranslation()
	const app = useApp()
	const userMenuLbl = msg(messages.userMenu)
	const user = useValue('auth', () => app.getUser(), [app])

	// The dropdown's open state is keyed globally by its id, so we can reuse the
	// same hook to open the menu when the user right-clicks the row.
	const [, onMenuOpenChange] = useMenuIsOpen(USER_SETTINGS_MENU_ID)

	return (
		<TldrawUiDropdownMenuRoot id={USER_SETTINGS_MENU_ID}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="menu"
						tooltip={userMenuLbl}
						title={userMenuLbl}
						className={classNames(styles.sidebarUserSettingsTrigger, styles.hoverable, className)}
						data-testid="tla-sidebar-user-settings-trigger"
						onContextMenu={(e) => {
							preventDefault(e)
							onMenuOpenChange(true)
						}}
					>
						{compact ? (
							<span aria-hidden="true">
								{user?.name
									?.split(/\s+/)
									.filter(Boolean)
									.map((part) => part[0])
									.slice(0, 2)
									.join('')
									.toUpperCase() || '•'}
							</span>
						) : (
							<TlaIcon icon="avatar" className={styles.sidebarUserSettingsAvatarIcon} />
						)}
						{!compact && (
							<div
								className={classNames(
									styles.sidebarUserSettingsName,
									'tla-text_ui__regular',
									'notranslate'
								)}
							>
								{user?.name || <F defaultMessage="Account" />}
							</div>
						)}
						{!compact && (
							<div className={styles.sidebarUserSettingsIcon}>
								<TlaIcon icon="help-circle" />
							</div>
						)}
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					side="bottom"
					align="end"
					{...TLA_MENU_POSITION}
					sideOffset={compact ? 4 : TLA_MENU_POSITION.sideOffset}
					alignOffset={compact ? 0 : -18}
					className={compact ? styles.userSettingsPopover : undefined}
				>
					<div className={compact ? styles.userSettingsPopoverBody : undefined}>
						{user && (
							<>
								<TldrawUiMenuGroup id="preferences">
									<ThemeSubmenu />
									<AppLanguageMenu />
								</TldrawUiMenuGroup>
								<DebugMenuGroup />
							</>
						)}
						<TldrawUiMenuGroup id="legal">
							{!compact && <UserManualMenuItem icon={false} />}
							<LegalSummaryMenuItem />
							<CookieConsentMenuItem />
						</TldrawUiMenuGroup>
						{user && (
							<TldrawUiMenuGroup id="signout">
								<SignOutMenuItem />
							</TldrawUiMenuGroup>
						)}
					</div>
					{compact && (
						<_DropdownMenu.Arrow asChild width={14} height={7}>
							<svg
								viewBox="0 0 14 7"
								className={styles.userSettingsPopoverArrow}
								aria-hidden="true"
							>
								<path d="M0 -1 V0 L7 7 L14 0 V-1 Z" />
								<path d="M0 0 L7 7 L14 0" fill="none" />
							</svg>
						</_DropdownMenu.Arrow>
					)}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
