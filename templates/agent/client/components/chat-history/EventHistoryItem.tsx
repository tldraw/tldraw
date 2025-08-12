import { TLAgent } from '../../ai/useAgent'
import { EventHistoryItem } from './AgentHistoryItem'
import { AgentIcon } from './AgentIcon'

export function EventHistoryItem({ item, agent }: { item: EventHistoryItem; agent: TLAgent }) {
	const { event } = item
	const eventUtil = agent.getEventUtil(event._type)
	const icon = eventUtil.getIcon(event)
	const label = eventUtil.getLabel(event, item.status)
	const description = eventUtil.getDescription(event, item.status)

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
