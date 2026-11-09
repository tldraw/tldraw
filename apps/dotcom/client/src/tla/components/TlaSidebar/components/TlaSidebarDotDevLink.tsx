import classNames from 'classnames'
import { defineMessages, TldrawUiIcon, useTranslation } from 'tldraw'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	buildWithTldraw: { defaultMessage: 'Build with the tldraw SDK' },
	buildWithSdk: { defaultMessage: 'Build with the SDK' },
	readTheDocs: { defaultMessage: 'Read the docs' },
})

export function TlaSidebarDotDevLink({
	destination = 'home',
	label,
}: { destination?: 'home' | 'docs'; label?: 'short' } = {}) {
	const msg = useTranslation()
	const isDocs = destination === 'docs'
	const lbl = msg(
		isDocs
			? messages.readTheDocs
			: label === 'short'
				? messages.buildWithSdk
				: messages.buildWithTldraw
	)
	return (
		<ExternalLink
			className={classNames(styles.sidebarLinkButton, styles.hoverable, 'tla-text_ui__regular')}
			to={
				isDocs
					? 'https://tldraw.dev/quick-start'
					: 'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'
			}
			data-testid={isDocs ? 'tla-docs-link' : 'tla-sidebar-dotdev-link'}
			eventName={isDocs ? 'docs-link-clicked' : 'sidebar-dotdev-link-clicked'}
		>
			<TldrawUiIcon icon={isDocs ? 'manual' : 'code'} label={lbl} small />
			<span className={styles.sidebarLinkButtonLabel}>{lbl}</span>
		</ExternalLink>
	)
}
