import { useEffect, useState } from 'react'
import type { AgentStatus } from '../agent/IntelligentCanvasAgent'

interface AgentStatusIndicatorProps {
	status: AgentStatus
	message?: string
	recording?: boolean
}

function FanText({ text }: { text: string }) {
	const [visibleCount, setVisibleCount] = useState(0)

	useEffect(() => {
		setVisibleCount(0)
		if (!text) return
		let i = 0
		const interval = setInterval(() => {
			i++
			setVisibleCount(i)
			if (i >= text.length) clearInterval(interval)
		}, 10)
		return () => clearInterval(interval)
	}, [text])

	return <>{text.slice(0, visibleCount)}</>
}

export function AgentStatusIndicator({ status, message, recording }: AgentStatusIndicatorProps) {
	const isActive = status !== 'idle'
	const isError = status === 'error'

	if (!isActive && !recording) return null

	const text = isActive ? (message ?? (isError ? 'Error' : 'Agent thinking...')) : 'Listening...'

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 60,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				fontSize: 12,
				fontFamily: 'monospace',
				color: isError ? '#c62828' : '#888',
				pointerEvents: 'none',
				zIndex: 1000,
				whiteSpace: 'nowrap',
			}}
		>
			{recording && (
				<div
					style={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						background: '#e53935',
						flexShrink: 0,
						animation: 'rec-pulse 1s ease-in-out infinite',
					}}
				/>
			)}
			<span>
				<FanText text={text} />
			</span>
		</div>
	)
}
