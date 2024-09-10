import { useEffect, useState } from 'react'
import './bisect.css'
import { prNumbers } from './pr-numbers'
export default function Bisect() {
	const [bisecStarted, setBisectStarted] = useState(false)
	const [goodPrIndex, setGoodPrIndex] = useState<number | null>(null)
	const [badPrIndex, setBadPrIndex] = useState<number | null>(null)
	const [showAll, setShowAll] = useState(false)
	const [openPreview, setOpenPreview] = useState(false)

	const resetBisect = () => {
		setGoodPrIndex(null)
		setBadPrIndex(null)
		setBisectStarted(false)
	}
	const bothMarked = goodPrIndex !== null && badPrIndex !== null
	const currentIndex = bothMarked ? Math.floor((goodPrIndex + badPrIndex) / 2) : null
	const diff = bothMarked ? Math.abs(goodPrIndex - badPrIndex) : Number.MAX_SAFE_INTEGER
	const done = bothMarked && diff <= 1

	useEffect(() => {
		if (!done && openPreview && currentIndex !== null) {
			window.open(`https://pr-${prNumbers[currentIndex]}-preview-deploy.tldraw.com/`, '_blank')
		}
	}, [done, currentIndex, openPreview])

	return (
		<div className="bisect__wrapper">
			<p>Use the preview links to test the target behaviour then mark the PR accordingly.</p>
			{!bisecStarted && <Button onClick={() => setBisectStarted(true)} text={'Start bisect'} />}
			{bisecStarted && (
				<div className="bisect__button-wrapper">
					<Button onClick={resetBisect} text={'Stop bisect'} />
					{!done && (
						<>
							<label htmlFor="show-all">
								<input
									id="show-all"
									type="checkbox"
									checked={showAll}
									onChange={(e) => setShowAll(e.target.checked)}
								/>
								Show all buttons
							</label>
							<label htmlFor="open-preview">
								<input
									id="open-preview"
									type="checkbox"
									checked={openPreview}
									onChange={(e) => setOpenPreview(e.target.checked)}
								/>
								Automatically open preview links
							</label>
						</>
					)}
				</div>
			)}
			<ul>
				{prNumbers.map((prNumber: number, index: number) => {
					const isCurrent = index === currentIndex
					const isGood = index === goodPrIndex
					const isBad = index === badPrIndex
					let color = 'black'
					let text = prNumber.toString()
					if (bisecStarted) {
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
						bisecStarted &&
						((bothMarked && isCurrent) || (!bothMarked && !isGood && !isBad) || showAll)
					const foundPr = done && index === badPrIndex

					return (
						<li key={prNumber}>
							<div className="bisect__item">
								<a
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
											<Button
												text="✅"
												title="Mark as good"
												onClick={() => setGoodPrIndex(index)}
												type="emoji"
												emphasize={emphasize}
											/>
											<Button
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
				})}
			</ul>
		</div>
	)
}

function Button({
	emphasize = false,
	text,
	title,
	type = 'regular',
	onClick,
}: {
	emphasize?: boolean
	text: string
	title?: string
	type?: 'regular' | 'emoji'
	onClick(): void
}) {
	const regular = type === 'regular'
	return (
		<button
			className="bisect__button"
			style={{
				backgroundColor: regular ? '#3182ED' : 'transparent',
				color: regular ? 'white' : 'black',
				padding: regular ? '10px' : 0,
				borderRadius: regular ? '5px' : 0,
				fontSize: emphasize ? '1.2em' : undefined,
			}}
			title={title}
			onClick={onClick}
		>
			{text}
		</button>
	)
}
