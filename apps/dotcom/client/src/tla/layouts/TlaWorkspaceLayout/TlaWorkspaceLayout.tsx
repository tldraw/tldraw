import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { defineMessages, F, useDialogs, useTranslation } from 'tldraw'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { routes } from '../../../routeDefs'
import { SubmitFeedbackDialog } from '../../components/dialogs/SubmitFeedbackDialog'
import { TlaIcon } from '../../components/TlaIcon/TlaIcon'
import { TlaLogo } from '../../components/TlaLogo/TlaLogo'
import { TlaSidebarDotDevLink } from '../../components/TlaSidebar/components/TlaSidebarDotDevLink'
import { TlaUserSettingsMenu } from '../../components/TlaSidebar/components/TlaSidebarUserSettingsMenu'
import { TlaSidebarWorkspaceSwitcher } from '../../components/TlaSidebar/components/TlaSidebarWorkspaceSwitcher'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import sidebarStyles from '../../components/TlaSidebar/sidebar.module.css'
import styles from './workspace-layout.module.css'

const messages = defineMessages({
	help: { defaultMessage: 'Get help' },
	workspaces: { defaultMessage: 'Workspaces' },
})

export function TlaWorkspaceLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()
	const app = useApp()
	const { addDialog } = useDialogs()
	const msg = useTranslation()
	const openAndTrack = useOpenUrlAndTrack('main-menu')

	return (
		<div className={styles.layout} data-testid="tla-workspace-layout">
			<header className={styles.header}>
				<nav className={styles.workspaceNavigation} aria-label={msg(messages.workspaces)}>
					<Link to={routes.tlaWorkspace(app.getHomeWorkspaceId())} className={styles.logoLink}>
						<TlaLogo className={styles.logo} />
					</Link>
					<TlaSidebarWorkspaceSwitcher
						destination="workspace"
						className={styles.workspaceSwitcher}
					/>
				</nav>
				<div className={styles.utilities}>
					<button
						className={styles.feedback}
						onClick={() => addDialog({ component: SubmitFeedbackDialog })}
					>
						<F defaultMessage="Feedback" />
					</button>
					<button
						className={styles.help}
						aria-label={msg(messages.help)}
						title={msg(messages.help)}
						onClick={() => openAndTrack('https://tldraw.notion.site/support')}
					>
						<TlaIcon icon="help-circle" />
					</button>
					<TlaUserSettingsMenu compact className={styles.account} />
				</div>
			</header>
			<main className={styles.main}>{children}</main>
			<footer className={styles.footer}>
				<TlaSidebarDotDevLink label="short" />
				<span className={styles.footerSeparator} aria-hidden="true" />
				<TlaSidebarDotDevLink destination="docs" />
				<span className={styles.footerSeparator} aria-hidden="true" />
				<button
					className={classNames(
						styles.footerFeedback,
						sidebarStyles.sidebarLinkButton,
						sidebarStyles.hoverable,
						'tla-text_ui__regular'
					)}
					onClick={() => addDialog({ component: SubmitFeedbackDialog })}
				>
					<TlaIcon icon="feedback" />
					<F defaultMessage="Leave some feedback" />
				</button>
			</footer>
		</div>
	)
}
