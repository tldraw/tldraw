import { WhatsNewResponse, WhatsNewUpdate } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { F, fetch } from 'tldraw'
import { routes } from '../../routeDefs'
import { TlaLogo } from '../components/TlaLogo/TlaLogo'
import { TlaWhatsNewMarkdown } from '../components/WhatsNew/TlaWhatsNewUpdate'
import styles from '../components/WhatsNew/whats-new.module.css'

export function Component() {
	const intl = useIntl()
	const [updates, setUpdates] = useState<WhatsNewUpdate[] | null>(null)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let cancelled = false
		fetch('/api/app/whats-new')
			.then((res) => (res.ok ? (res.json() as Promise<WhatsNewResponse>) : Promise.reject()))
			.then(({ updates }) => !cancelled && setUpdates(updates))
			.catch(() => !cancelled && setFailed(true))
		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div className={styles.page}>
			<main className={styles.pageInner}>
				<header className={styles.pageHeader}>
					<Link to={routes.tlaRoot()} className={styles.pageLogo}>
						<TlaLogo />
					</Link>
					<h1 className={styles.pageTitle}>
						<F defaultMessage="What's new" />
					</h1>
					<p className={styles.pageSubtitle}>
						<F defaultMessage="New features and improvements in tldraw." />
					</p>
				</header>
				{failed && (
					<p className={styles.pageEmpty}>
						<F defaultMessage="Couldn't load updates. Try again later." />
					</p>
				)}
				{updates?.length === 0 && (
					<p className={styles.pageEmpty}>
						<F defaultMessage="Nothing here yet." />
					</p>
				)}
				{updates?.map((u) => (
					<article key={u.id} className={styles.pageEntry}>
						<time className={styles.pageEntryDate}>
							{intl.formatDate(u.publishedAt ?? u.updatedAt, { dateStyle: 'long' })}
						</time>
						<div className={styles.pageEntryContent}>
							<h2 className={styles.pageEntryTitle}>{u.title}</h2>
							<TlaWhatsNewMarkdown body={u.body} />
						</div>
					</article>
				))}
			</main>
		</div>
	)
}
