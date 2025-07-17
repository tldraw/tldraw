import { FormEventHandler, useEffect } from 'react'
import { Editor, useLocalStorageState, useReactor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, DEFAULT_MODEL_NAME, TLAgentModelName } from '../worker/models'
import { $contextItems, ContextPreview } from './Context'
import { BrainIcon } from './icons/BrainIcon'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { CommentIcon } from './icons/CommentIcon'
import { TargetIcon } from './icons/TargetIcon'

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
	const isTargetToolActive = useValue(
		'isTargetToolActive',
		() => editor.getCurrentTool().id === 'target',
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
			<form onSubmit={handleSubmit}>
				<div className="chat-input-attachments">
					{/* <button type="button">
						<AtIcon /> Add Context
					</button> */}
					<button
						type="button"
						className={isTargetToolActive ? 'active' : ''}
						onClick={() => {
							editor.setCurrentTool('target')
							editor.focus()
						}}
					>
						<TargetIcon /> Pick Target
					</button>
					{contextItems.map((item, i) => (
						<ContextPreview
							onRemove={() => {
								$contextItems.update((items) => {
									return items.filter((v) => v.id !== item.id)
								})
							}}
							key={'context-item-' + i}
							context={item}
						/>
					))}
				</div>
				<input
					ref={inputRef}
					name="input"
					type="text"
					autoComplete="off"
					placeholder="Ask, learn, brainstorm, draw"
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
					<button>{isGenerating ? '◼' : '⬆'}</button>
				</span>
			</form>
		</div>
	)
}
