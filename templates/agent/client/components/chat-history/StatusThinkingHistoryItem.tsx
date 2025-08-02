import { useEffect, useState } from 'react'
import { StatusThinkingHistoryItem } from '../../types/ChatHistoryItem'

export function StatusThinkingHistoryItem({ item }: { item: StatusThinkingHistoryItem }) {
	const [startTime] = useState(() => new Date())
	const [endTime, setEndTime] = useState<Date | null>(null)
	const [currentTime, setCurrentTime] = useState(() => new Date())

	useEffect(() => {
		if ((item.status === 'done' || item.status === 'cancelled') && !endTime) {
			setEndTime(new Date())
		}
	}, [item.status, endTime])

	// Update current time every second while status is 'progress'
	useEffect(() => {
		if (item.status !== 'progress') return

		const interval = setInterval(() => {
			setCurrentTime(new Date())
		}, 1000)

		return () => clearInterval(interval)
	}, [item.status])

	const secondsElapsed = Math.floor(
		(endTime ? endTime.getTime() : currentTime.getTime()) / 1000 - startTime.getTime() / 1000
	)

	if (item.status === 'done') return null

	return (
		<div className="agent-chat-message status-thinking-message">
			<p className="status-thinking-message-text">
				Thinking for {secondsElapsed}s {item.status === 'cancelled' ? '(cancelled)' : ''}
			</p>
		</div>
	)
}
