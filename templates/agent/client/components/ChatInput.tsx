import { FormEventHandler, useEffect, useState } from 'react'
import { Editor, useReactor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, AgentModelName } from '../../worker/models'
import { $contextItems, addToContext, removeFromContext } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { convertTldrawShapeToSimpleShape } from '../promptParts/convertTldrawShapeToSimpleShape'
import { ContextPreview } from './ContextPreview'
import { AtIcon } from './icons/AtIcon'
import { BrainIcon } from './icons/BrainIcon'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { CommentIcon } from './icons/CommentIcon'
import { SelectionContextPreview } from './SelectionContextPreview'

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

	const someShapesSelected = useValue(
		'someShapesSelected',
		() => {
			const shapes = editor.getSelectedShapes()
			return shapes.length > 0
		},
		[editor]
	)

	const contextItems = useValue('contextItems', () => $contextItems.get(), [$contextItems])

	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

	useEffect(() => {
		const localContextItems = localStorage.getItem('context-items')
		if (localContextItems) {
			try {
				$contextItems.set(JSON.parse(localContextItems))
			} catch (e) {
				console.error(e)
			}
		}
	}, [])

	useReactor(
		'stash locally',
		() => {
			localStorage.setItem('context-items', JSON.stringify($contextItems.get()))
		},
		[$contextItems]
	)

	useReactor(
		'stash model name locally',
		() => {
			localStorage.setItem('model-name', JSON.stringify($modelName.get()))
		},
		[$modelName]
	)

	return (
		<div className="chat-input">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const shapes = editor.getSelectedShapes()
					addToContext({
						type: 'shapes',
						shapes: shapes.map((v) => convertTldrawShapeToSimpleShape(v, editor)),
						source: 'user',
					})
					setInputValue('')
					handleSubmit(e)
				}}
			>
				<div className="chat-input-context-items">
					<div className={'chat-context-select ' + (isContextToolActive ? 'active' : '')}>
						<div className="chat-input-actions-label">
							<AtIcon /> Add Context
						</div>
						<select
							id="add-context-select"
							value=" "
							onChange={(e) => {
								const action = ADD_CONTEXT_ACTIONS.find((action) => action.name === e.target.value)
								if (action) action.onSelect(editor)
							}}
						>
							{ADD_CONTEXT_ACTIONS.map((action) => {
								const disabled = action.name === 'Current Selection' && !someShapesSelected
								return (
									<option key={action.name} value={action.name} disabled={disabled}>
										{action.name}
									</option>
								)
							})}
						</select>
					</div>
					<SelectionContextPreview editor={editor} />
					{contextItems.map(
						(item, i) =>
							item.source === 'user' && (
								<ContextPreview
									onClick={() => removeFromContext(item)}
									key={'context-item-' + i}
									contextItem={item}
								/>
							)
					)}
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
				<span className="chat-input-actions">
					<div className="chat-input-actions-left">
						<div className="chat-mode-select">
							<CommentIcon />
							<span>Agent</span>
							<ChevronDownIcon />
						</div>
						<div className="chat-model-select">
							<div className="chat-input-actions-label">
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
					<button disabled={inputValue === '' && !isGenerating}>
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
