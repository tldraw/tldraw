import { Link } from 'react-router-dom'
import '../../../styles/core.css'

// todo: remove tailwind

export function BoardHistoryLog({ data }: { data: string[] }) {
	if (data.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-header">{'No history found'}</p>
			</div>
		)
	}

	return (
		<div>
			<ul className="board-history__list">
				{data.map((v, i) => {
					const timeStamp = v.split('/').pop()
					return (
						<li key={i}>
							<Link to={`./${timeStamp}`} target="_blank">
								{formatDate(timeStamp!)}
							</Link>
						</li>
					)
				})}
			</ul>
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
