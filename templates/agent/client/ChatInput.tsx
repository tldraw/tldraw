import { FormEventHandler } from 'react'
import { useLocalStorageState } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, DEFAULT_MODEL_NAME, TLAgentModelName } from '../worker/models'
import { AtIcon } from './icons/AtIcon'
import { BrainIcon } from './icons/BrainIcon'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { CommentIcon } from './icons/CommentIcon'

export function ChatInput({
	handleSubmit,
	inputRef,
	isGenerating,
}: {
	handleSubmit: FormEventHandler<HTMLFormElement>
	inputRef: React.RefObject<HTMLInputElement>
	isGenerating: boolean
}) {
	const [modelName, setModelName] = useLocalStorageState<TLAgentModelName>(
		'model-name',
		DEFAULT_MODEL_NAME
	)

	return (
		<div className="chat-input">
			<form onSubmit={handleSubmit}>
				<div className="chat-input-attachments">
					<button type="button">
						<AtIcon /> Add Context
					</button>
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
