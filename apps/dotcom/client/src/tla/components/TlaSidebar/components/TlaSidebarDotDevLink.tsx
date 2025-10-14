import classNames from 'classnames'
import { TldrawUiIcon, useLocalStorageState } from 'tldraw'
import { F } from '../../../utils/i18n'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

export function TlaSidebarDotDevLink() {
	const [showDotDevLink, setShowDotDevLink] = useLocalStorageState('showDotDevLink', true)
	if (!showDotDevLink) return null

	return (
		<div className={styles.sidebarDotDevLink}>
			<ExternalLink to="https://tldraw.dev" data-testid="tla-sidebar-dotdev-link">
				<F defaultMessage="Build with the tldraw SDK" />
				<TldrawUiIcon icon="arrow-left" label="Build with the tldraw SDK" small />
			</ExternalLink>
			<button
				title="Dismiss"
				data-testid="tla-sidebar-dotdev-dismiss-button"
				className={classNames(styles.sidebarDotDevDismissButton, styles.hoverable)}
				onClick={() => setShowDotDevLink(false)}
			>
				<TldrawUiIcon icon="cross-2" label="Hide" small />
			</button>
		</div>
	)
}
