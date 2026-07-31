import { useState } from 'react'
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

export function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
