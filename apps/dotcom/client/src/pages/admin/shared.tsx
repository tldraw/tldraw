import { useEffect, useState } from 'react'
import { AdminButton } from './AdminButton'
import styles from './admin.module.css'

// Helper component for structured data display.
export function StructuredDataDisplay({ data }: { data: object }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	return (
		<div className={styles.structuredData}>
			<AdminButton onClick={handleCopy} variant="secondary" className={styles.copyButton}>
				{copied ? 'Copied!' : 'Copy JSON'}
			</AdminButton>
			<pre className={styles.dataDisplay}>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

export function useTransientMessage(durationMs = 3000) {
	const [message, setMessage] = useState(null as string | null)
	useEffect(() => {
		if (!message) return
		const timer = setTimeout(() => setMessage(null), durationMs)
		return () => clearTimeout(timer)
	}, [message, durationMs])
	return [message, setMessage] as const
}

export async function getResponseError(res: Response) {
	return `${res.statusText}: ${await res.text()}`
}

export function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "412 geo, 88 arrow, 3 frame" — biggest first, so the summary line leads with what matters. */
export function formatTally(tally: Record<string, number>) {
	const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
	if (entries.length === 0) return 'none'
	return entries.map(([name, count]) => `${count.toLocaleString()} ${name}`).join(', ')
}
