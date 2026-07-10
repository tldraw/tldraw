import { TldrawUiIcon } from '@tldraw/ui'
import classNames from 'classnames'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	buildWithTldraw: { defaultMessage: 'Build with the tldraw SDK' },
})

export function TlaSidebarDotDevLink() {
	const lbl = useMsg(messages.buildWithTldraw)
	return (
		<ExternalLink
			className={classNames(styles.sidebarLinkButton, styles.hoverable, 'tla-text_ui__regular')}
			to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link"
			data-testid="tla-sidebar-dotdev-link"
			eventName="sidebar-dotdev-link-clicked"
		>
			<TldrawUiIcon icon="code" label={lbl} small />
			<span className={styles.sidebarLinkButtonLabel}>{lbl}</span>
		</ExternalLink>
	)
}
