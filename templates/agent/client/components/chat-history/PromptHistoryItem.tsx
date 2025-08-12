import { CONTEXT_TYPE_DEFINITIONS, ContextItem } from '../../types/ContextItem'
import { AgentIcon } from '../icons/AgentIcon'
import { PromptHistoryItem } from './AgentHistoryItem'

export function PromptHistoryItem({ item }: { item: PromptHistoryItem }) {
	return (
		<div>
			<div className="user-message">
				{item.contextItems.length > 0 && (
					<div className="user-message-context-items">
						{item.contextItems.map((contextItem, i) => {
							return <UserMessageContextItem key={'context-item-' + i} contextItem={contextItem} />
						})}
					</div>
				)}
				{item.message.split('\n').map((line, i, arr) => (
					<span key={i}>
						{line}
						{i < arr.length - 1 && <br />}
					</span>
				))}
			</div>
		</div>
	)
}

function UserMessageContextItem({ contextItem }: { contextItem: ContextItem }) {
	const contextTypeDefinition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const icon = contextTypeDefinition.icon
	const name = contextTypeDefinition.name(contextItem)
	return (
		<div className="context-item-preview">
			<AgentIcon type={icon} /> {name}
		</div>
	)
}
