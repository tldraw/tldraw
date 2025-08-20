import { AgentEventHistoryItem } from '../../../shared/types/AgentHistoryItem'
import { TLAgent } from '../../ai/useTldrawAgent'
import { AgentIcon } from '../icons/AgentIcon'

export function EventHistoryItem({ item, agent }: { item: AgentEventHistoryItem; agent: TLAgent }) {
	const { event } = item
	const eventUtil = agent.getEventUtil(event._type)
	const icon = eventUtil.getIcon(event)
	const label = eventUtil.getLabel(event, item.status)
	const description = eventUtil.getDescription(event, item.status)
	if (!description) return null

	return (
		<div className={`agent-action-message agent-action-type-${event._type}`}>
			{icon && (
				<span>
					<AgentIcon type={icon} />
				</span>
			)}
			<span>
				{label && <strong>{label}: </strong>}
				{description}
			</span>
		</div>
	)
}
