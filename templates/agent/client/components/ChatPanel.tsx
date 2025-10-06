import { FormEventHandler, useCallback, useRef } from 'react'
import { Box, modulate, useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/convertTldrawShapeToSimpleShape'
import { TldrawAgent } from '../agent/TldrawAgent'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel({ agent }: { agent: TldrawAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelName = useValue(agent.$modelName)

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
			const todosRemaining = agent.$todoList.get().filter((item) => item.status !== 'done')
			if (todosRemaining.length === 0) {
				agent.$todoList.set([])
			}

			// Grab the user query and clear the chat input
			const message = value
			const contextItems = agent.$contextItems.get()
			agent.$contextItems.set([])
			inputRef.current.value = ''

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToSimpleShape(editor, shape))

			// Set the agent's request bounds
			const userBoundsCenter = editor.getViewportPageBounds().center
			const screenBounds = editor.getViewportScreenBounds()

			// Map zoom from user's full range to a range the agent will be able to adequately act in
			const zoomSteps = editor.getCameraOptions().zoomSteps
			const zoomMin = zoomSteps[0]
			const zoomMax = zoomSteps[zoomSteps.length - 1]
			const mappedZoom = modulate(editor.getZoomLevel(), [zoomMin, zoomMax], [0.75, 1.25])
			const agentRequestBoundsUnscaled = Box.FromCenter(userBoundsCenter, {
				x: screenBounds.width,
				y: screenBounds.height,
			})
			const agentRequestBounds = agentRequestBoundsUnscaled.scale(mappedZoom)

			await agent.prompt({
				message,
				contextItems,
				bounds: agentRequestBounds,
				modelName,
				selectedShapes,
				type: 'user',
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
			<ChatHistory agent={agent} />
			<div className="chat-input-container">
				<TodoList agent={agent} />
				<ChatInput agent={agent} handleSubmit={handleSubmit} inputRef={inputRef} />
			</div>
		</div>
	)
}
