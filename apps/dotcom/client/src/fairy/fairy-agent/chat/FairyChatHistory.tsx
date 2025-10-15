import { useEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { TldrawFairyAgent } from '../agent/TldrawFairyAgent'
import { FairyChatHistorySection, getAgentHistorySections } from './FairyChatHistorySection'

export function FairyChatHistory({ agent }: { agent: TldrawFairyAgent }) {
	const historyItems = useValue(agent.$chatHistory)
	const sections = getAgentHistorySections(historyItems)
	const historyRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	useEffect(() => {
		if (!historyRef.current) return

		if (historyItems.at(-1)?.type === 'prompt') {
			if (previousScrollDistanceFromBottomRef.current <= 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
				previousScrollDistanceFromBottomRef.current = 0
			}
			return
		}

		if (previousScrollDistanceFromBottomRef.current <= 0) {
			const scrollDistanceFromBottom =
				historyRef.current.scrollHeight -
				historyRef.current.scrollTop -
				historyRef.current.clientHeight

			if (scrollDistanceFromBottom > 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
			}
		}
	}, [historyRef, historyItems])

	const handleScroll = () => {
		if (!historyRef.current) return
		const scrollDistanceFromBottom =
			historyRef.current.scrollHeight -
			historyRef.current.scrollTop -
			historyRef.current.clientHeight

		previousScrollDistanceFromBottomRef.current = scrollDistanceFromBottom
	}

	return (
		<div className="fairy-chat-history" ref={historyRef} onScroll={handleScroll}>
			{sections.length === 0 ? (
				<div className="fairy-chat-empty"></div>
			) : (
				sections.map((section: FairyChatHistorySection, i: number) => {
					return <FairyChatHistorySection key={'history-section-' + i} section={section} />
				})
			)}
		</div>
	)
}
