import { useEffect, useState } from 'react'
import { BisectButton } from './BisectButton'
import { PrItem } from './PrItem'
import { prNumbers } from './pr-numbers'

export default function Bisect() {
	const [bisectStarted, setBisectStarted] = useState(false)
	const [goodPrIndex, setGoodPrIndex] = useState<number | null>(null)
	const [badPrIndex, setBadPrIndex] = useState<number | null>(null)
	const [showAll, setShowAll] = useState(false)
	const [openPreview, setOpenPreview] = useState(false)

	const stopBisect = () => {
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
			{bisectStarted ? (
				<div className="bisect__button-wrapper">
					<BisectButton onClick={stopBisect} text={'Stop bisect'} />
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
			) : (
				<BisectButton onClick={() => setBisectStarted(true)} text={'Start bisect'} />
			)}
			<ul>
				{prNumbers.map((prNumber: number, index: number) => {
					return (
						<PrItem
							key={prNumber}
							prNumber={prNumber}
							index={index}
							currentIndex={currentIndex}
							badPrIndex={badPrIndex}
							goodPrIndex={goodPrIndex}
							done={done}
							bothMarked={bothMarked}
							bisectStarted={bisectStarted}
							setGoodPrIndex={setGoodPrIndex}
							setBadPrIndex={setBadPrIndex}
							showAll={showAll}
						/>
					)
				})}
			</ul>
		</div>
	)
}
