import { CONTEXT_TYPE_DEFINITIONS, ContextItem } from '../../shared/types/ContextItem'
import { AgentIcon } from './icons/AgentIcon'

export function ContextPreview({
	contextItem,
	onClick,
}: {
	contextItem: ContextItem
	onClick(): void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const name = definition.name(contextItem)
	const icon = definition.icon
	return (
		<button type="button" className="context-item-preview" onClick={onClick}>
			<AgentIcon type={icon} /> {name}
		</button>
	)
}
