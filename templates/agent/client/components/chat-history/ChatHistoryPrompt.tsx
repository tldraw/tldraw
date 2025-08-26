import { Editor } from 'tldraw'
import { IChatHistoryPromptItem } from '../../../shared/types/ChatHistoryItem'
import { ContextItems } from '../ContextPreview'
import { SelectionPreview } from '../SelectionPreview'

export function ChatHistoryPrompt({
	item,
	editor,
}: {
	item: IChatHistoryPromptItem
	editor: Editor
}) {
	const { contextItems, message, selectedShapes } = item

	return (
		<div className="chat-history-prompt-container">
			<div className="chat-history-prompt">
				{contextItems.length > 0 && <ContextItems contextItems={contextItems} editor={editor} />}
				{selectedShapes.length > 0 && <SelectionPreview selectedShapes={selectedShapes} />}
				{message.split('\n').map((line, i, arr) => (
					<span key={i}>
						{line}
						{i < arr.length - 1 && <br />}
					</span>
				))}
			</div>
		</div>
	)
}
