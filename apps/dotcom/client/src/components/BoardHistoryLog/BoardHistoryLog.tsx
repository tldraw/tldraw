import { Link } from 'react-router-dom'

// todo: remove tailwind

interface HistoryEntry {
	timestamp: string
	href?: string
}

interface BoardHistoryLogProps {
	data: HistoryEntry[]
	hasMore?: boolean
	onLoadMore?(): void
	isLoading?: boolean
}

const monthFormat = Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long' })
const dateFormat = Intl.DateTimeFormat('en-GB', {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric',
})

function groupTimestampsByMonth(entries: HistoryEntry[]) {
	const groups = new Map<string, HistoryEntry[]>()
	for (const entry of entries) {
		const month = monthFormat.format(new Date(entry.timestamp))
		const group = groups.get(month)
		if (group) group.push(entry)
		else groups.set(month, [entry])
	}
	return [...groups].map(([month, timestamps]) => ({ month, timestamps }))
}

export function BoardHistoryLog({ data, hasMore, onLoadMore, isLoading }: BoardHistoryLogProps) {
	if (data.length === 0) {
		return (
			<div>
				<p>{'No history found'}</p>
			</div>
		)
	}

	const groupedData = groupTimestampsByMonth(data)

	return (
		<div className="board-history">
			<h1>Board history</h1>
			<p>Recent versions of this file. You can restore any previous version.</p>
			<div className="board-history__list">
				{groupedData.map((group) => (
					<div key={group.month} className="board-history__month-group">
						<h3 className="board-history__month-header">{group.month}</h3>
						<ol className="board-history__list">
							{group.timestamps.map(({ timestamp, href }) => (
								<li key={timestamp}>
									<Link to={href || `./${timestamp}`}>
										{dateFormat.format(new Date(timestamp))}
									</Link>
								</li>
							))}
						</ol>
					</div>
				))}
			</div>
			{hasMore && (
				<div className="board-history__load-more">
					<button
						onClick={onLoadMore}
						disabled={isLoading}
						className="board-history__load-more-button"
					>
						{isLoading ? 'Loading...' : 'Load More'}
					</button>
				</div>
			)}
		</div>
	)
}
