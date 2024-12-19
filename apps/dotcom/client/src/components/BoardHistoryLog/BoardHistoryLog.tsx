import { Link } from 'react-router-dom'

// todo: remove tailwind

export function BoardHistoryLog({ data }: { data: string[] }) {
	if (data.length === 0) {
		return (
			<div>
				<p>{'No history found'}</p>
			</div>
		)
	}

	return (
		<div className="board-history">
			<h1>Board history</h1>
			<p>All previous versions found for this file. You can restore any previous version.</p>
			<ol className="board-history__list">
				{data.map((v, i) => {
					const timeStamp = v.split('/').pop()
					return (
						<li key={i}>
							<Link to={`./${timeStamp}`}>{formatDate(timeStamp!)}</Link>
						</li>
					)
				})}
			</ol>
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
