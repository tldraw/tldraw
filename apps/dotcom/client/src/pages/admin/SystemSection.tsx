import { useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { sentryReleaseName } from '../../../sentry-release-name'
import { StructuredDataDisplay } from './shared'
import styles from './admin.module.css'

export function SystemSection() {
	const [outboxData, setOutboxData] = useState(null)
	const [error, setError] = useState(null as string | null)

	useEffect(() => {
		fetch('/api/app/admin/outbox')
			.then(async (res) => {
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				setError(null)
				setOutboxData(await res.json())
			})
			.catch((e) => {
				setError(e.message)
			})
	}, [])

	return (
		<>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Release</h3>
				<p className={styles.adminReleaseMeta}>
					<span className={styles.adminReleaseLabel}>Release:</span>{' '}
					<code className={styles.adminReleaseValue} translate="no">
						{sentryReleaseName}
					</code>
				</p>
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>System health</h3>
				{error && <div className={styles.errorMessage}>{error}</div>}
				{outboxData && <StructuredDataDisplay data={outboxData} />}
			</section>
		</>
	)
}
