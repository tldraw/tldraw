import { FormEventHandler, useCallback, useEffect, useState } from 'react'
import { Editor, useLocalStorageState, useReactor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, DEFAULT_MODEL_NAME, TLAgentModelName } from '../../worker/models'
import { $contextItems, addToContext, removeFromContext } from '../atoms/contextItems'
import { AtIcon } from '../icons/AtIcon'
import { BrainIcon } from '../icons/BrainIcon'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'
import { CommentIcon } from '../icons/CommentIcon'
import { CursorIcon } from '../icons/CursorIcon'
import { CONTEXT_TYPE_DEFINITIONS, ContextItem } from '../types/ContextItem'

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

export function ContextPreview({
	contextItem,
	onClick,
}: {
	contextItem: ContextItem
	onClick(): void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const name = definition.name(contextItem)
	const icon = definition.icon(contextItem)
	return (
		<button type="button" className="context-item-preview" onClick={onClick}>
			{icon} {name}
		</button>
	)
}

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
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const shapes = editor.getSelectedShapes()
					for (const shape of shapes) {
						addToContext({ type: 'shape', shape, source: 'user' })
					}
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
					{<LiveSelectionIndicator editor={editor} />}
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

	function LiveSelectionIndicator({ editor }: { editor: Editor }) {
		const shapes = useValue('shapes', () => editor.getSelectedShapes(), [editor])

		const handleClick = useCallback(() => {
			editor.selectNone()
		}, [editor])

		if (shapes.length === 0) {
			return null
		}

		return (
			<button type="button" className="context-item-preview" onClick={handleClick}>
				<CursorIcon /> Selection {shapes.length > 1 && `(${shapes.length})`}
			</button>
		)
	}
}
