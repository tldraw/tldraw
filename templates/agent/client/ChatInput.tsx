import { FormEventHandler, useEffect, useState } from 'react'
import { Editor, useLocalStorageState, useReactor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, DEFAULT_MODEL_NAME, TLAgentModelName } from '../worker/models'
import { $contextItems, addToContext, ContextPreview, removeFromContext } from './Context'
import { AtIcon } from './icons/AtIcon'
import { BrainIcon } from './icons/BrainIcon'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { CommentIcon } from './icons/CommentIcon'

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
		name: 'Current Selection',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('select')
			const shapes = editor.getSelectedShapes()
			for (const shape of shapes) {
				addToContext({ type: 'shape', shape, source: 'user' })
			}
			editor.focus()
		},
	},
	{
		name: 'Current Viewport',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('select')
			const bounds = editor.getViewportPageBounds()
			addToContext({ type: 'area', bounds, source: 'user' })
			editor.focus()
		},
	},
	// {
	// 	name: 'Current Page',
	// 	onSelect: (editor: Editor) => {
	// 		editor.setCurrentTool('select')
	// 		addToContext({ type: 'page', page: editor.getCurrentPage(), source: 'user' })
	// 		editor.focus()
	// 	},
	// },
	{
		name: ' ',
		onSelect: () => {},
	},
]

export function ChatInput({
	handleSubmit,
	inputRef,
	isGenerating,
	editor,
}: {
	handleSubmit: FormEventHandler<HTMLFormElement>
	inputRef: React.RefObject<HTMLInputElement>
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
	const contextAttachments = useValue(
		'contextAttachments',
		() => contextItems.filter((item) => item.type === 'area'),
		[contextItems]
	)

	const [modelName, setModelName] = useLocalStorageState<TLAgentModelName>(
		'model-name',
		DEFAULT_MODEL_NAME
	)

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

	return (
		<div className="chat-input">
			<div className="chat-input-context-attachments">
				{contextAttachments.map(
					(item, i) =>
						item.source === 'user' && (
							<div key={'context-attachment-' + i} className="chat-input-context-attachment">
								{`x: ${item.bounds.x.toFixed(0)}, y: ${item.bounds.y.toFixed(0)}, w: ${item.bounds.w.toFixed(0)}, h: ${item.bounds.h.toFixed(0)}`}
							</div>
						)
				)}
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					setInputValue('')
					handleSubmit(e)
				}}
			>
				<div className="chat-input-context-items">
					<div className={'chat-context-select ' + (isContextToolActive ? 'active' : '')}>
						<div className="chat-input-actions-label">
							<AtIcon /> Add Context
						</div>
						{/* TODO: Replace this with an actual combobox */}
						<select
							id="add-context-select"
							value={' '}
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
				<input
					ref={inputRef}
					name="input"
					type="text"
					autoComplete="off"
					placeholder="Ask, learn, brainstorm, draw"
					value={inputValue}
					onInput={(e) => setInputValue(e.currentTarget.value)}
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
								onChange={(e) => setModelName(e.target.value as TLAgentModelName)}
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
