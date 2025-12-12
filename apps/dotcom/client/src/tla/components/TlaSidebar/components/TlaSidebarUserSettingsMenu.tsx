import classNames from 'classnames'
import {
	LanguageMenu,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useValue,
} from 'tldraw'
import { isDevelopmentEnv } from '../../../../utils/env'
import { useApp } from '../../../hooks/useAppState'
import { useWhatsNew } from '../../../hooks/useWhatsNew'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import {
	toggleFairies,
	toggleFairiesDebug,
	useAreFairiesDebugEnabled,
	useAreFairiesEnabled,
} from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { TlaWhatsNewDialog } from '../../dialogs/TlaWhatsNewDialog'
import {
	ColorThemeSubmenu,
	DebugMenuGroup,
	ImportFileActionItem,
	SignOutMenuItem,
} from '../../menu-items/menu-items'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	userMenu: { defaultMessage: 'User settings' },
	fairies: { defaultMessage: 'Fairies' },
	enableFairies: { defaultMessage: 'Enable fairies' },
	debugFairies: { defaultMessage: 'Debug fairies' },
	whatsNew: { defaultMessage: "What's new" },
})

export function TlaUserSettingsMenu() {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const userMenuLbl = useMsg(messages.userMenu)
	const whatsNewLbl = useMsg(messages.whatsNew)
	const user = useValue('auth', () => app.getUser(), [app])
	const { entries } = useWhatsNew()

	const latestVersion = entries[0]?.version
	const hasNewWhatsNew = latestVersion && user?.whatsNewSeenVersion !== latestVersion

	const handleWhatsNewClick = () => {
		trackEvent('open-whats-new-dialog', { source: 'sidebar' })
		if (latestVersion) {
			app.z.mutate.user.updateWhatsNewSeenVersion({ version: latestVersion })
		}
		addDialog({ component: TlaWhatsNewDialog })
	}

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
					{entries.length > 0 && (
						<TldrawUiMenuGroup
							id="whats-new"
							className={hasNewWhatsNew ? styles.whatsNewMenuGroup : undefined}
						>
							<TldrawUiMenuItem
								id="whats-new"
								label={whatsNewLbl}
								onSelect={handleWhatsNewClick}
								readonlyOk
							/>
						</TldrawUiMenuGroup>
					)}
					<TldrawUiMenuGroup id="preferences">
						<ColorThemeSubmenu />
						<LanguageMenu />
						<FairiesSubmenu />
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

function FairiesSubmenu() {
	const areFairiesEnabled = useAreFairiesEnabled()
	const areFairiesDebugEnabled = useAreFairiesDebugEnabled()
	const fairiesLbl = useMsg(messages.fairies)
	const enableFairiesLbl = useMsg(messages.enableFairies)
	const debugFairiesLbl = useMsg(messages.debugFairies)

	return (
		<TldrawUiMenuSubmenu id="fairies" label={fairiesLbl}>
			<TldrawUiMenuGroup id="fairies-settings">
				<TldrawUiMenuCheckboxItem
					id="enable-fairies"
					label={enableFairiesLbl}
					checked={areFairiesEnabled}
					onSelect={() => toggleFairies()}
					readonlyOk
				/>
				{isDevelopmentEnv && (
					<TldrawUiMenuCheckboxItem
						id="debug-fairies"
						label={debugFairiesLbl}
						checked={areFairiesDebugEnabled}
						onSelect={() => toggleFairiesDebug()}
						readonlyOk
					/>
				)}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
