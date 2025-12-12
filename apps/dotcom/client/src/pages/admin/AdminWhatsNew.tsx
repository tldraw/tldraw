import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import styles from '../admin.module.css'

export function AdminWhatsNew() {
	const [entries, setEntries] = useState<WhatsNewEntry[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)

	const loadEntries = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/whats-new')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			setEntries(data.entries || [])
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load entries')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadEntries()
	}, [loadEntries])

	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}

			<p className="tla-text_ui__small">
				Manage What's New content that appears in the user settings menu.
			</p>

			{isLoading ? (
				<p className="tla-text_ui__small">Loading...</p>
			) : (
				<div>
					<p className="tla-text_ui__small">
						{entries.length} {entries.length === 1 ? 'entry' : 'entries'} found
					</p>
					{/* TODO: Add entry management UI */}
				</div>
			)}
		</div>
	)
}
