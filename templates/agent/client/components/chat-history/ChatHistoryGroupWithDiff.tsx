import { useCallback, useMemo } from 'react'
import { reverseRecordsDiff, squashRecordDiffs } from 'tldraw'
import { AgentIcon, AgentIconType } from '../../../shared/icons/AgentIcon'
import { ChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { useAgent } from '../../agent/TldrawAgentAppProvider'
import { ChatHistoryGroup } from './ChatHistoryGroup'
import { TldrawDiffViewer } from './TldrawDiffViewer'
import { getActionInfo } from './getActionInfo'

export function ChatHistoryGroupWithDiff({ group }: { group: ChatHistoryGroup }) {
	const agent = useAgent()
	const { items } = group
	const { editor } = agent
	const diff = useMemo(() => squashRecordDiffs(items.map((item) => item.diff)), [items])

	// Accept all changes from this group
	const handleAccept = useCallback(() => {
		agent.chat.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)

				// Mark the item as accepted
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'accepted' }
				}

				// Apply the diff if needed
				if (item.acceptance === 'rejected') {
					editor.store.applyDiff(item.diff)
				}
			}
			return newItems
		})
	}, [items, editor, agent.chat])

	// Reject all changes from this group
	const handleReject = useCallback(() => {
		agent.chat.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)

				// Mark the item as rejected
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'rejected' }
				}

				// Reverse the diff if needed
				if (item.acceptance !== 'rejected') {
					const reverseDiff = reverseRecordsDiff(item.diff)
					editor.store.applyDiff(reverseDiff)
				}
			}
			return newItems
		})
	}, [items, editor, agent.chat])

	// Get the acceptance status of the group
	// If all items are accepted, the group is accepted
	// If all items are rejected, the group is rejected
	// Otherwise, the group is pending
	const acceptance = useMemo<ChatHistoryActionItem['acceptance']>(() => {
		if (items.length === 0) return 'pending'
		const acceptance = items[0].acceptance
		for (let i = 1; i < items.length; i++) {
			if (items[i].acceptance !== acceptance) {
				return 'pending'
			}
		}
		return acceptance
	}, [items])

	const steps = useMemo(
		() => items.map((item) => getActionInfo(item.action, agent)),
		[items, agent]
	)

	return (
		<div className="chat-history-change">
			<div className="chat-history-change-acceptance">
				<button onClick={handleReject} disabled={acceptance === 'rejected'}>
					{acceptance === 'rejected' ? 'Rejected' : 'Reject'}
				</button>
				<button onClick={handleAccept} disabled={acceptance === 'accepted'}>
					{acceptance === 'accepted' ? 'Accepted' : 'Accept'}
				</button>
			</div>
			<DiffSteps steps={steps} />
			<TldrawDiffViewer diff={diff} />
		</div>
	)
}

interface DiffStep {
	icon: AgentIconType | null
	description: string | null
}

function DiffSteps({ steps }: { steps: DiffStep[] }) {
	let previousDescription = ''
	return (
		<div className="agent-changes">
			{steps.map((step, i) => {
				if (!step.description) return null

				if (step.description === previousDescription) return null
				previousDescription = step.description
				return (
					<div className="agent-change" key={'intent-' + i}>
						{step.icon && (
							<span className="agent-change-icon">
								<AgentIcon type={step.icon} />
							</span>
						)}
						{step.description}
					</div>
				)
			})}
		</div>
	)
}
