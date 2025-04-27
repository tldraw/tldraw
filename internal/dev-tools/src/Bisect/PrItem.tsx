import { BisectButton } from './BisectButton'

export function PrItem({
	done,
	bisectStarted,
	bothMarked,
	index,
	badPrIndex,
	currentIndex,
	goodPrIndex,
	setBadPrIndex,
	setGoodPrIndex,
	showAll,
	prNumber,
}: {
	done: boolean
	bisectStarted: boolean
	bothMarked: boolean
	index: number
	badPrIndex: number | null
	currentIndex: number | null
	goodPrIndex: number | null
	setBadPrIndex(index: number): void
	setGoodPrIndex(index: number): void
	showAll: boolean
	prNumber: number
}) {
	const isCurrent = index === currentIndex
	const isGood = index === goodPrIndex
	const isBad = index === badPrIndex
	let color = 'black'
	let text = prNumber.toString()
	if (bisectStarted) {
		if (isCurrent) {
			color = '#4465E9'
		} else if (isGood) {
			color = '#079268'
			text += '(✅)'
		} else if (isBad) {
			color = '#E03130'
			text += '(❌)'
		}
	}
	const emphasize = color !== 'black'

	const enableButtons =
		bisectStarted && ((bothMarked && isCurrent) || (!bothMarked && !isGood && !isBad) || showAll)
	const foundPr = done && index === badPrIndex
	return (
		<li>
			<div className="bisect__item">
				<a
					className="mono"
					style={{
						color,
						fontWeight: emphasize ? 'bold' : 'normal',
						fontSize: emphasize ? '1.2em' : '1em',
					}}
					target="_blank"
					href={`https://github.com/tldraw/tldraw/pull/${prNumber}`}
					rel="noreferrer"
				>
					{text}
				</a>
				{enableButtons && !done && (
					<>
						<a
							className="mono"
							style={{
								color,
								fontWeight: emphasize ? 'bold' : 'normal',
							}}
							target="_blank"
							href={`https://pr-${prNumber}-preview-deploy.tldraw.com/`}
							rel="noreferrer"
						>
							(preview)
						</a>
						<div className="bisect__good-bad-wrapper">
							<BisectButton
								text="✅"
								title="Mark as good"
								onClick={() => setGoodPrIndex(index)}
								type="emoji"
								emphasize={emphasize}
							/>
							<BisectButton
								text="❌"
								title="Mark as bad"
								onClick={() => setBadPrIndex(index)}
								type="emoji"
								emphasize={emphasize}
							/>
						</div>
					</>
				)}
				{foundPr && <span>{'⬅️ 👀'}</span>}
			</div>
		</li>
	)
}
