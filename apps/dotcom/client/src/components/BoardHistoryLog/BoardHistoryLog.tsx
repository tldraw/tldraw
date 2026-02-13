import { Link } from 'react-router-dom'

// todo: remove tailwind

interface BoardHistoryLogProps {
	data: { timestamp: string; href?: string }[]
	hasMore?: boolean
	onLoadMore?(): void
	isLoading?: boolean
}

function getMonthYear(timestamp: string): string {
	const date = new Date(timestamp)
	return Intl.DateTimeFormat('en-GB', {
		year: 'numeric',
		month: 'long',
	}).format(date)
}

function groupTimestampsByMonth(
	timestamps: { timestamp: string; href?: string }[]
): Array<{ month: string; timestamps: { timestamp: string; href?: string }[] }> {
	const groups: { [key: string]: { timestamp: string; href?: string }[] } = {}

	timestamps.forEach(({ timestamp, href }) => {
		const monthKey = getMonthYear(timestamp)
		if (!groups[monthKey]) {
			groups[monthKey] = []
		}
		groups[monthKey].push({ timestamp, href })
	})

	return Object.entries(groups).map(([month, timestamps]) => ({
		month,
		timestamps,
	}))
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
				{groupedData.map((group, groupIndex) => (
					<div key={groupIndex} className="board-history__month-group">
						<h3 className="board-history__month-header">{group.month}</h3>
						<ol className="board-history__list">
							{group.timestamps.map(({ timestamp, href }, i) => {
								return (
									<li key={i}>
										<Link to={href || `./${timestamp}`}>{formatDate(timestamp)}</Link>
									</li>
								)
							})}
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

function formatDate(dateISOString: string) {
	const date = new Date(dateISOString)
	return Intl.DateTimeFormat('en-GB', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
	}).format(date)
}
