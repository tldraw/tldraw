import { Editor } from 'tldraw'
import { CONTEXT_TYPE_DEFINITIONS, IContextItem } from '../../shared/types/ContextItem'
import { AgentIcon } from './icons/AgentIcon'

export function ContextItemPreview({
	item,
	editor,
	onClick,
}: {
	item: IContextItem
	editor: Editor
	onClick?(item: IContextItem): void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[item.type]
	const name = definition.name(item, editor)
	const icon = definition.icon

	return onClick ? (
		<button type="button" className="context-item-preview" onClick={() => onClick(item)}>
			<AgentIcon type={icon} /> {name}
		</button>
	) : (
		<div className="context-item-preview">
			<AgentIcon type={icon} /> {name}
		</div>
	)
}

export function ContextItems({
	contextItems,
	onClick,
	editor,
}: {
	contextItems: IContextItem[]
	onClick?(contextItem: IContextItem): void
	editor: Editor
}) {
	return (
		<div className="context-item-preview-container">
			{contextItems.map((contextItem, i) => {
				return (
					<ContextItemPreview
						editor={editor}
						key={'context-item-' + i}
						item={contextItem}
						onClick={onClick ? () => onClick(contextItem) : undefined}
					/>
				)
			})}
		</div>
	)
}
