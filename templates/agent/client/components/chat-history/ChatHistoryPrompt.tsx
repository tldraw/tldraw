import { Editor } from 'tldraw'
import { ChatHistoryPromptItem } from '../../../shared/types/ChatHistoryItem'
import { ContextItemTag } from '../ContextItemTag'
import { SelectionTag } from '../SelectionTag'

export function ChatHistoryPrompt({
	item,
	editor,
}: {
	item: ChatHistoryPromptItem
	editor: Editor
}) {
	const { contextItems, message, selectedShapes } = item

	const showTags = selectedShapes.length > 0 || contextItems.length > 0

	return (
		<div className="chat-history-prompt-container">
			<div className="chat-history-prompt">
				{showTags && (
					<div className="prompt-tags">
						{selectedShapes.length > 0 && <SelectionTag />}
						{contextItems.map((contextItem, i) => (
							<ContextItemTag editor={editor} key={'context-item-' + i} item={contextItem} />
						))}
					</div>
				)}
				{message}
			</div>
		</div>
	)
}
