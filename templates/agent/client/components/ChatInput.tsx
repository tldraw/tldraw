import { FormEventHandler, useState } from 'react'
import { Editor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, AgentModelName } from '../../worker/models'
import { $contextItems, removeFromContext } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { ContextItemTag } from './ContextItemTag'
import { AtIcon } from './icons/AtIcon'
import { BrainIcon } from './icons/BrainIcon'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { CommentIcon } from './icons/CommentIcon'
import { SelectionTag } from './SelectionTag'

export function ChatInput({
	handleSubmit,
	inputRef,
	isGenerating,
	editor,
}: {
	handleSubmit: FormEventHandler<HTMLFormElement>
	inputRef: React.RefObject<HTMLTextAreaElement>
	isGenerating: boolean
	editor: Editor
}) {
	const [inputValue, setInputValue] = useState('')

	const isContextToolActive = useValue(
		'isContextToolActive',
		() => {
			const tool = editor.getCurrentTool()
			return tool.id === 'target-shape' || tool.id === 'target-area'
		},
		[editor]
	)

	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor])
	const contextItems = useValue('contextItems', () => $contextItems.get(), [$contextItems])
	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

	return (
		<div className="chat-input">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					setInputValue('')
					handleSubmit(e)
				}}
			>
				<div className="prompt-tags">
					<div className={'chat-context-select ' + (isContextToolActive ? 'active' : '')}>
						<div className="chat-context-select-label">
							<AtIcon /> Add Context
						</div>
						<select
							id="chat-context-select"
							value=" "
							onChange={(e) => {
								const action = ADD_CONTEXT_ACTIONS.find((action) => action.name === e.target.value)
								if (action) action.onSelect(editor)
							}}
						>
							{ADD_CONTEXT_ACTIONS.map((action) => {
								return (
									<option key={action.name} value={action.name}>
										{action.name}
									</option>
								)
							})}
						</select>
					</div>
					<SelectionTag count={selectedShapes.length} onClick={() => editor.selectNone()} />
					{contextItems.map((item, i) => (
						<ContextItemTag
							editor={editor}
							onClick={() => removeFromContext(item)}
							key={'context-item-' + i}
							item={item}
						/>
					))}
				</div>

				<textarea
					ref={inputRef}
					name="input"
					autoComplete="off"
					placeholder="Ask, learn, brainstorm, draw"
					value={inputValue}
					onInput={(e) => setInputValue(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							//idk about this but it works oops -max
							const form = e.currentTarget.closest('form')
							if (form) {
								const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
								form.dispatchEvent(submitEvent)
							}
						}
					}}
				/>
				<span className="chat-actions">
					<div className="chat-actions-left">
						<div className="chat-mode-select">
							<CommentIcon />
							<span>Agent</span>
							<ChevronDownIcon />
						</div>
						<div className="chat-model-select">
							<div className="chat-model-select-label">
								<BrainIcon /> {modelName}
							</div>
							<select
								value={modelName}
								onChange={(e) => $modelName.set(e.target.value as AgentModelName)}
							>
								{Object.values(AGENT_MODEL_DEFINITIONS).map((model) => (
									<option key={model.name} value={model.name}>
										{model.name}
									</option>
								))}
							</select>
							<ChevronDownIcon />
						</div>
					</div>
					<button className="chat-input-submit" disabled={inputValue === '' && !isGenerating}>
						{isGenerating && inputValue === '' ? '◼' : '⬆'}
					</button>
				</span>
			</form>
		</div>
	)
}

const ADD_CONTEXT_ACTIONS = [
	{
		name: 'Pick Shapes',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('target-shape')
			editor.focus()
		},
	},
	{
		name: 'Pick Area',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('target-area')
			editor.focus()
		},
	},
	{
		name: ' ',
		onSelect: (editor: Editor) => {
			const currentTool = editor.getCurrentTool()
			if (currentTool.id === 'target-area' || currentTool.id === 'target-shape') {
				editor.setCurrentTool('select')
			}
		},
	},
]
