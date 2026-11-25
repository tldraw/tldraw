import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { defineMessages, TldrawUiButton, useDialogs, useTranslation, useValue } from 'tldraw'
import { routes } from '../../../routeDefs'
import { TlaSettingsDialog } from '../../components/dialogs/TlaSettingsDialog'
import { TlaLogo } from '../../components/TlaLogo/TlaLogo'
import { TlaUserAvatar } from '../../components/TlaUserAvatar/TlaUserAvatar'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { TlaWorkspaceSwitcher } from './TlaWorkspaceSwitcher'
import styles from './workspace-layout.module.css'

const messages = defineMessages({
	userSettings: { defaultMessage: 'User settings' },
})

/** The v3 shell for everything that isn't the canvas: a logo and workspace header over a scrolling page. */
export function TlaWorkspaceLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()
	const app = useApp()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const user = useValue('auth', () => app.getUser(), [app])
	const userSettingsLbl = msg(messages.userSettings)

	return (
		<div className={styles.layout} data-testid="tla-workspace-layout">
			<div className={styles.scroll}>
				<header className={styles.header}>
					<Link
						to={routes.tlaWorkspace(app.getHomeWorkspaceId())}
						className={styles.logoLink}
						data-testid="tla-workspace-logo"
					>
						<TlaLogo className={styles.logo} />
					</Link>
					<TlaWorkspaceSwitcher />
					<div className={styles.spacer} />
					<TldrawUiButton
						type="icon"
						className={styles.account}
						tooltip={userSettingsLbl}
						title={userSettingsLbl}
						data-testid="tla-user-settings-trigger"
						onClick={() => addDialog({ component: () => <TlaSettingsDialog /> })}
					>
						<TlaUserAvatar user={user} className={styles.accountAvatar} />
					</TldrawUiButton>
				</header>
				<main className={styles.main}>{children}</main>
			</div>
		</div>
	)
}
