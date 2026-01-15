import { FormEventHandler, useCallback, useRef } from 'react'
import { useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/convertTldrawShapeToSimpleShape'
import { useAgent } from '../agent/TldrawAgentAppProvider'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel() {
	const agent = useAgent()
	const { editor } = agent
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelName = useValue('modelName', () => agent.$modelName.get(), [agent])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (!inputRef.current) return
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				agent.cancel()
				return
			}

			// If every todo is done, clear the todo list
			const todosRemaining = agent.todos.getTodos().filter((item) => item.status !== 'done')
			if (todosRemaining.length === 0) {
				agent.todos.reset()
			}

			// Grab the user query and clear the chat input
			const contextItems = agent.context.getItems()
			agent.context.clear()
			inputRef.current.value = ''

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToSimpleShape(editor, shape))

			agent.interrupt({
				input: {
					messages: [value],
					contextItems,
					bounds: editor.getViewportPageBounds(),
					modelName,
					selectedShapes,
					source: 'user',
				},
			})
		},
		[agent, modelName, editor]
	)

	function handleNewChat() {
		agent.reset()
	}

	function NewChatButton() {
		return (
			<button className="new-chat-button" onClick={handleNewChat}>
				+
			</button>
		)
	}

	return (
		<div className="chat-panel tl-theme__dark">
			<div className="chat-header">
				<NewChatButton />
			</div>
			<ChatHistory />
			<div className="chat-input-container">
				<TodoList />
				<ChatInput handleSubmit={handleSubmit} inputRef={inputRef} />
			</div>
		</div>
	)
}
