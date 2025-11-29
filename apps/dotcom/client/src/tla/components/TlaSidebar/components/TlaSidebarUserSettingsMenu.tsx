import classNames from 'classnames'
import {
	LanguageMenu,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useValue,
} from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useFairyAccess } from '../../../hooks/useFairyAccess'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import { toggleFairies, useAreFairiesEnabled } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import {
	ColorThemeSubmenu,
	DebugMenuGroup,
	ImportFileActionItem,
	SignOutMenuItem,
} from '../../menu-items/menu-items'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	userMenu: { defaultMessage: 'User settings' },
	enableFairies: { defaultMessage: 'Enable fairies' },
})

export function TlaUserSettingsMenu() {
	const app = useApp()
	const userMenuLbl = useMsg(messages.userMenu)
	const user = useValue('auth', () => app.getUser(), [app])
	const hasFairyAccess = useFairyAccess()
	const areFairiesEnabled = useAreFairiesEnabled()
	const enableFairiesLbl = useMsg(messages.enableFairies)

	if (!user) return null

	return (
		<TldrawUiDropdownMenuRoot id={`user-settings-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button
						className={classNames(styles.sidebarUserSettingsTrigger, styles.hoverable)}
						title={userMenuLbl}
						data-testid="tla-sidebar-user-settings-trigger"
					>
						<div
							className={classNames(
								styles.sidebarUserSettingsName,
								'tla-text_ui__regular',
								'notranslate'
							)}
						>
							{user.name || <F defaultMessage="Account" />}
						</div>
						<div className={styles.sidebarUserSettingsIcon}>
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
						{hasFairyAccess && (
							<TldrawUiMenuCheckboxItem
								id="enable-fairies"
								label={enableFairiesLbl}
								checked={areFairiesEnabled}
								onSelect={() => toggleFairies()}
								readonlyOk
							/>
						)}
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
