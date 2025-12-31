import classNames from 'classnames'
import { TldrawUiIcon, useLocalStorageState } from 'tldraw'
import { trackEvent } from '../../../../utils/analytics'
import { F } from '../../../utils/i18n'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

export function TlaSidebarDotDevLink() {
	const [showDotDevLink, setShowDotDevLink] = useLocalStorageState('showDotDevLink', true)
	if (!showDotDevLink) return null

	return (
		<div className={styles.sidebarDotDevLink}>
			<ExternalLink
				to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link"
				data-testid="tla-sidebar-dotdev-link"
				eventName="sidebar-dotdev-link-clicked"
				onClick={() => {
					setShowDotDevLink(false)
				}}
			>
				<F defaultMessage="Build with the tldraw SDK" />
				<TldrawUiIcon icon="arrow-left" label="Build with the tldraw SDK" small />
			</ExternalLink>
			<button
				title="Dismiss"
				data-testid="tla-sidebar-dotdev-dismiss-button"
				aria-label="Dismiss"
				className={classNames(styles.sidebarDotDevDismissButton, styles.hoverable)}
				onClick={() => {
					trackEvent('sidebar-dotdev-link-dismissed')
					setShowDotDevLink(false)
				}}
			>
				<TldrawUiIcon icon="cross-2" label="Hide" small />
			</button>
		</div>
	)
}
