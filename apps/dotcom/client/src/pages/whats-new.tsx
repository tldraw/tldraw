import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { Helmet } from 'react-helmet-async'
import Markdown from 'react-markdown'
import { Link, useLoaderData } from 'react-router-dom'
import { fetch } from 'tldraw'
import { F } from '../tla/utils/i18n'
import styles from './whats-new.module.css'

export async function loader() {
	try {
		const res = await fetch('/api/app/whats-new')
		if (!res.ok) throw new Error('Failed to load updates')
		const data = await res.json()
		return { entries: Array.isArray(data) ? data : [], error: null }
	} catch (err) {
		return { entries: [], error: 'Failed to load updates' }
	}
}

export function Component() {
	const { entries, error } = useLoaderData() as { entries: WhatsNewEntry[]; error: string | null }

	return (
		<>
			<Helmet>
				<title>What's new - tldraw</title>
			</Helmet>
			<div className={styles.container}>
				<div className={styles.content}>
					<Link to="/" className={styles.homeButton}>
						<F defaultMessage="Home" />
					</Link>
					<div className={styles.whatsNewWrapper}>
						<div className={styles.logo} />
						<h1 className={styles.pageTitle}>What's new</h1>
						{error ? (
							<div className={styles.error}>{error}</div>
						) : entries.length === 0 ? (
							<div className={styles.empty}>No updates yet</div>
						) : (
							<div className={styles.entriesList}>
								{entries.map((entry) => {
									const date = new Date(entry.date)
									return (
										<div key={entry.version} className={styles.entry}>
											<div className={styles.entryMeta}>
												<h2 className={styles.entryTitle}>{entry.title}</h2>
												<span className={styles.date}>
													{date.toLocaleDateString('en-US', {
														month: 'short',
														year: 'numeric',
													})}
												</span>
											</div>
											<div className={styles.entryMain}>
												<div className={styles.entryContent}>
													<Markdown>{entry.description}</Markdown>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	)
}
