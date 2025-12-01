import { ChatHistoryPromptItem } from '@tldraw/fairy-shared'
import { useLayoutEffect, useRef } from 'react'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useChatHistory } from '../../fairy-ui/hooks/useFairyAgentChatHistory'
import { FairyChatHistorySection, getAgentHistorySections } from './FairyChatHistorySection'

/*
Chat history is stored as a list of history items.

Within the UI, we split this list of items into sections.
Each section contains a user prompt item, and all the agent's actions that follow it.

Each section is rendered as a separate component.
The model's actions are grouped together into collapsible groups if appropriate.

Here's an example of how the UI might look:

- Chat history
	- Section 
		- Prompt
		- Action group
			- Action
			- Action
		- Action group
			- Action
	- Section
		- Prompt
		- Action group
			- Action

*/

export function FairyChatHistory({ agent }: { agent: FairyAgent }) {
	const historyItems = useChatHistory(agent)
	// const currentMode = agent.getMode()
	// const modeDefinition = getFairyModeDefinition(currentMode)
	// const filteredItems = filterChatHistoryByMode(historyItems, modeDefinition.memoryLevel)
	const filteredItems = historyItems // filterChatHistoryByMode(historyItems, modeDefinition.memoryLevel)
	const sections = getAgentHistorySections(filteredItems)
	const historyRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	useLayoutEffect(() => {
		if (!historyRef.current) return

		// If a new prompt is submitted by the user, scroll to the bottom
		const lastItem = filteredItems.at(-1)
		if (lastItem && lastItem?.type === 'prompt') {
			if ((lastItem as ChatHistoryPromptItem).promptSource === 'user') {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
				previousScrollDistanceFromBottomRef.current = 0
				return
			}
		}

		// If the user is scrolled to the bottom, keep them there while new actions appear
		if (previousScrollDistanceFromBottomRef.current <= 0) {
			const scrollDistanceFromBottom =
				historyRef.current.scrollHeight -
				historyRef.current.scrollTop -
				historyRef.current.clientHeight

			if (scrollDistanceFromBottom > 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
			}
		}
	}, [historyRef, filteredItems])

	// Keep track of the user's scroll position
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
			{sections.map((section, i) => {
				return (
					<FairyChatHistorySection
						key={'history-section-' + i}
						section={section}
						agent={agent}
						isFinalSection={i === sections.length - 1}
					/>
				)
			})}
		</div>
	)
}
