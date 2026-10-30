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
	const { contextItems, agentFacingMessage, userFacingMessage, selectedShapes, promptSource } = item

	const showTags = selectedShapes.length > 0 || contextItems.length > 0

	return (
		<div className="chat-history-prompt-container">
			<div className={`chat-history-prompt chat-history-prompt-${promptSource}`}>
				{showTags && (
					<div className="prompt-tags">
						{selectedShapes.length > 0 && <SelectionTag />}
						{contextItems.map((contextItem, i) => (
							<ContextItemTag editor={editor} key={'context-item-' + i} item={contextItem} />
						))}
					</div>
				)}
				<span className="chat-history-prompt-content">
					{userFacingMessage ?? agentFacingMessage}
				</span>
			</div>
		</div>
	)
}
