import { WhatsNewUpdate } from '@tldraw/dotcom-shared'
import { useIntl } from 'react-intl'
import Markdown, { Components } from 'react-markdown'
import { F } from 'tldraw'
import styles from './whats-new.module.css'

// Pathname, not the raw string, so `clip.mp4?v=2` still counts.
function isVideo(src: string) {
	try {
		return new URL(src, window.location.href).pathname.endsWith('.mp4')
	} catch {
		return false
	}
}

const markdownComponents: Components = {
	img: ({ src, alt }) =>
		typeof src === 'string' && isVideo(src) ? (
			<video className={styles.media} src={src} muted autoPlay loop playsInline />
		) : (
			<img className={styles.media} src={src} alt={alt ?? ''} />
		),
	a: ({ href, children }) => (
		<a href={href} target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	),
}

export function TlaWhatsNewMarkdown({ body }: { body: string }) {
	return (
		<div className={styles.markdown}>
			<Markdown skipHtml components={markdownComponents}>
				{body}
			</Markdown>
		</div>
	)
}

export function TlaWhatsNewUpdate({ update }: { update: WhatsNewUpdate }) {
	const intl = useIntl()
	return (
		<article className={styles.update}>
			<header className={styles.updateHeader}>
				<h2 className={styles.updateTitle}>{update.title}</h2>
				<time className={styles.updateDate}>
					{intl.formatDate(update.publishedAt ?? update.updatedAt, { dateStyle: 'medium' })}
				</time>
				{update.status === 'draft' && (
					<span className={styles.draftBadge}>
						<F defaultMessage="Draft" />
					</span>
				)}
			</header>
			<TlaWhatsNewMarkdown body={update.body} />
		</article>
	)
}
