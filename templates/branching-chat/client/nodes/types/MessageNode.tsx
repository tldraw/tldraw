import { ModelMessage } from 'ai'
import { useCallback } from 'react'
import {
	T,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiInput,
	useEditor,
	useMarkEventAsHandled,
} from 'tldraw'
import { HandleIcon } from '../../components/icons/HandleIcon'
import { SendIcon } from '../../components/icons/SendIcon'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { getAllConnectedNodes } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import { getNodeBodyHeightPx } from '../nodeTypes'
import { NodeDefinition, shapeInputPort, shapeOutputPort, updateNode } from './shared'

/**
 * This node is a message from the user.
 */
export type MessageNode = T.TypeOf<typeof MessageNodeType>
export const MessageNodeType = T.object({
	type: T.literal('message'),
	userMessage: T.string,
	assistantMessage: T.string,
})

export const MessageNode: NodeDefinition<MessageNode> = {
	type: 'message',
	validator: MessageNodeType,
	title: 'Message',
	icon: <SendIcon />,
	getDefault: () => ({
		type: 'message',
		userMessage: 'hello',
		assistantMessage: '',
	}),
	getBodyWidthPx: (_node, _editor) => NODE_WIDTH_PX,
	getBodyHeightPx: (_node, _editor) => {
		const assistantMessage = _node.assistantMessage.trim()
		if (assistantMessage === '') return NODE_HEIGHT_PX
		const size = _editor.textMeasure.measureText(assistantMessage, {
			fontFamily: 'Inter',
			fontSize: 12,
			fontWeight: '500',
			fontStyle: 'normal',
			maxWidth: NODE_WIDTH_PX,
			lineHeight: 1.3,
			padding: '12px',
		})
		return NODE_HEIGHT_PX + size.h
	},
	getPorts: (node, editor) => ({
		input: shapeInputPort,
		output: {
			...shapeOutputPort,
			y: getNodeBodyHeightPx(node, editor),
		},
	}),
	computeOutput: async (_node, _inputs) => ({
		message: 'hello',
	}),

	onPortConnect: (editor, shape, _node, portId) => {
		if (!portId.startsWith('item_')) return
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
		}))
	},

	onPortDisconnect: (editor, shape) => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
		}))
	},

	Component: ({ node, shape }) => {
		const editor = useEditor()
		const markEventAsHandled = useMarkEventAsHandled()

		const handleSend = useCallback(() => {
			// 1. gather up parents and create message history
			// 2. create prompt
			// 3. send prompt to ai
			// 4. update node with assistant message

			const messages: ModelMessage[] = []

			const connectedNodeShapes = getAllConnectedNodes(editor, shape, 'end')
			for (const connectedShape of connectedNodeShapes) {
				const node = editor.getShape(connectedShape)

				if (!node) continue
				if (!editor.isShapeOfType<NodeShape>(node, 'node')) continue
				if (node.props.node.type !== 'message') continue

				if (node.props.node.assistantMessage && connectedShape !== shape.id) {
					messages.push({
						role: 'assistant',
						content: node.props.node.assistantMessage ?? '',
					})
				}

				messages.push({
					role: 'user',
					content: node.props.node.userMessage ?? '',
				})
			}

			messages.reverse()

			// clear any previous assistant message before starting
			updateNode<MessageNode>(editor, shape, (node) => ({
				...node,
				assistantMessage: '...',
			}))

			// stream the response and append as chunks arrive
			;(async () => {
				try {
					const response = await fetch('/stream', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(messages),
					})
					if (!response.body) return

					const reader = response.body.getReader()
					const decoder = new TextDecoder()
					let accumulatedText = ''

					while (true) {
						const { value, done } = await reader.read()
						if (done) break
						const chunk = decoder.decode(value, { stream: true })
						// Some environments may send SSE-style lines; extract data if so, else use raw chunk
						const maybeSse = chunk
							.split('\n')
							.filter((line) => line.startsWith('data:'))
							.map((line) => line.replace(/^data:\s?/, ''))
							.join('')
						accumulatedText += maybeSse || chunk
						updateNode<MessageNode>(editor, shape, (node) => ({
							...node,
							assistantMessage: accumulatedText,
						}))
					}
				} catch (e) {
					console.error(e)
				}
			})()
		}, [editor, shape])

		const handleMessageChange = useCallback(
			(value: string) => {
				updateNode<MessageNode>(editor, shape, (node) => ({
					...node,
					userMessage: value,
				}))
			},
			[editor, shape]
		)

		return (
			<>
				<div
					style={{
						pointerEvents: 'auto',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
						<div
							style={{
								height: '100%',
								width: 32,
								paddingLeft: 4,
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								cursor: 'grab',
							}}
						>
							<TldrawUiButtonIcon icon={<HandleIcon />} />
						</div>
						<div
							style={{ padding: '4px 0px 0px 4px', flexGrow: 2 }}
							onPointerDown={markEventAsHandled}
						>
							<div style={{ padding: '0px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
								<TldrawUiInput
									value={node.userMessage}
									onValueChange={handleMessageChange}
									onComplete={handleSend}
								/>
							</div>
						</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0px 0px' }}>
							<TldrawUiButton
								type="primary"
								onClick={handleSend}
								onPointerDown={markEventAsHandled}
							>
								<TldrawUiButtonIcon icon={<SendIcon />} />
							</TldrawUiButton>
						</div>
					</div>
					{node.assistantMessage && (
						<div style={{ padding: 4 }}>
							<div
								style={{
									padding: 8,
									lineHeight: '1.3',
									fontSize: '12px',
									borderRadius: 6,
									border: '1px solid #e2e8f0',
									fontWeight: '500',
									fontFamily: 'Inter',
									overflowWrap: 'normal',
									whiteSpace: 'pre-wrap',
								}}
							>
								{node.assistantMessage}
							</div>
						</div>
					)}
				</div>
			</>
		)
	},
}
