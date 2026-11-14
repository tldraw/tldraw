import { useEffect, useState } from 'react'

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
