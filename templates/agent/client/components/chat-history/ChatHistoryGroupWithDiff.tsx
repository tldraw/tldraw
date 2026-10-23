import { useCallback, useMemo } from 'react'
import { reverseRecordsDiff, squashRecordDiffs } from 'tldraw'
import { AgentIcon } from '../../../shared/icons/AgentIcon'
import { ChatHistoryInfo } from '../../../shared/types/ChatHistoryInfo'
import { ChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { useAgent } from '../../agent/TldrawAgentAppProvider'
import { ChatHistoryGroup } from './ChatHistoryGroup'
import { getActionInfo } from './getActionInfo'
import { TldrawDiffViewer } from './TldrawDiffViewer'

export function ChatHistoryGroupWithDiff({ group }: { group: ChatHistoryGroup }) {
	const agent = useAgent()
	const { items } = group
	const { editor } = agent
	const diff = useMemo(() => squashRecordDiffs(items.map((item) => item.diff)), [items])

	// Mark every item in the group, and apply or reverse each item's diff so the canvas matches
	const setAcceptance = useCallback(
		(acceptance: 'accepted' | 'rejected') => {
			agent.chat.update((currentChatHistoryItems) => {
				const newItems = [...currentChatHistoryItems]
				for (const item of items) {
					const index = newItems.indexOf(item)
					if (index !== -1) {
						newItems[index] = { ...item, acceptance }
					}

					const wasRejected = item.acceptance === 'rejected'
					if (acceptance === 'accepted' && wasRejected) {
						editor.store.applyDiff(item.diff)
					} else if (acceptance === 'rejected' && !wasRejected) {
						editor.store.applyDiff(reverseRecordsDiff(item.diff))
					}
				}
				return newItems
			})
		},
		[items, editor, agent.chat]
	)

	// Get the acceptance status of the group
	// If all items are accepted, the group is accepted
	// If all items are rejected, the group is rejected
	// Otherwise, the group is pending
	const acceptance = useMemo<ChatHistoryActionItem['acceptance']>(() => {
		const first = items[0]?.acceptance
		if (!first) return 'pending'
		return items.every((item) => item.acceptance === first) ? first : 'pending'
	}, [items])

	const steps = useMemo(
		() => items.map((item) => getActionInfo(item.action, agent)),
		[items, agent]
	)

	return (
		<div className="chat-history-change">
			<div className="chat-history-change-acceptance">
				<button onClick={() => setAcceptance('rejected')} disabled={acceptance === 'rejected'}>
					{acceptance === 'rejected' ? 'Rejected' : 'Reject'}
				</button>
				<button onClick={() => setAcceptance('accepted')} disabled={acceptance === 'accepted'}>
					{acceptance === 'accepted' ? 'Accepted' : 'Accept'}
				</button>
			</div>
			<DiffSteps steps={steps} />
			<TldrawDiffViewer diff={diff} />
		</div>
	)
}

function DiffSteps({ steps }: { steps: Pick<ChatHistoryInfo, 'icon' | 'description'>[] }) {
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
