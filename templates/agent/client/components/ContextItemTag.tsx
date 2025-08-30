import { Editor } from 'tldraw'
import { CONTEXT_TYPE_DEFINITIONS, IContextItem } from '../../shared/types/ContextItem'
import { PromptTag } from './PromptTag'

export function ContextItemTag({
	item,
	editor,
	onClick,
}: {
	item: IContextItem
	editor: Editor
	onClick?: () => void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[item.type]
	const name = definition.name(item, editor)
	const icon = definition.icon

	return <PromptTag text={name} icon={icon} onClick={onClick} />
}
