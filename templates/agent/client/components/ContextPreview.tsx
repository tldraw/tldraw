import { CONTEXT_TYPE_DEFINITIONS, ContextItem } from '../types/ContextItem'

export function ContextPreview({
	contextItem,
	onClick,
}: {
	contextItem: ContextItem
	onClick(): void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const name = definition.name(contextItem)
	const icon = definition.icon(contextItem)
	return (
		<button type="button" className="context-item-preview" onClick={onClick}>
			{icon} {name}
		</button>
	)
}
