import { useCallback, useRef, useState } from 'react'

const MAX_DEV_LOG_ENTRIES = 200
export const DEV_LOG_PANEL_HEIGHT = 140
export const DEV_LOG_PANEL_GAP = 8

export function useDevLog() {
	const [isDev, setIsDev] = useState(false)
	const [isDevLogVisible, setIsDevLogVisible] = useState(false)
	const [devLogEntries, setDevLogEntries] = useState<string[]>([])
	const isDevRef = useRef(false)

	const logIfDevMode = useCallback((message: string) => {
		if (!isDevRef.current) return
		setDevLogEntries((entries) => {
			const timestamp = new Date().toLocaleTimeString()
			const nextEntries = [...entries, `[${timestamp}] ${message}`]
			return nextEntries.slice(-MAX_DEV_LOG_ENTRIES)
		})
	}, [])

	const toggleDevLog = useCallback(() => {
		setIsDevLogVisible((visible) => !visible)
	}, [])

	const enableDevMode = useCallback(() => {
		isDevRef.current = true
		setIsDev(true)
		setIsDevLogVisible(true)
	}, [])

	return {
		isDev,
		isDevLogVisible,
		devLogEntries,
		isDevRef,
		logIfDevMode,
		toggleDevLog,
		enableDevMode,
	}
}

export function DevLogPanel({
	entries,
	isFullscreen,
}: {
	entries: string[]
	isFullscreen: boolean
}) {
	return (
		<div
			style={{
				flex: isFullscreen ? '0 0 160px' : undefined,
				minHeight: 80,
				maxHeight: isFullscreen ? 200 : DEV_LOG_PANEL_HEIGHT,
				overflow: 'auto',
				padding: 12,
				border: '1px solid var(--tl-color-muted-2)',
				borderRadius: 8,
				background: 'var(--tl-color-panel)',
				fontFamily: 'monospace',
				fontSize: 12,
				lineHeight: 1.5,
				whiteSpace: 'pre-wrap',
			}}
		>
			{entries.length > 0 ? entries.join('\n') : 'Dev log ready.'}
		</div>
	)
}
