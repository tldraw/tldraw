import { useState } from 'react'
import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useEditor,
	useValue,
} from 'tldraw'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

const fairyMessages = defineMessages({
	toolbar: { defaultMessage: 'Fairies' },
	deselect: { defaultMessage: 'Deselect Fairy' },
	select: { defaultMessage: 'Select Fairy' },
})

function FairyButton({
	agent,
	onClick,
	selectMessage,
	deselectMessage,
}: {
	agent: TldrawFairyAgent
	onClick(): void
	selectMessage: string
	deselectMessage: string
}) {
	// Use useValue to make the component reactive
	const fairyIsSelected = useValue(
		'fairy-button-selected',
		() => agent.$fairy.get()?.isSelected ?? false,
		[agent]
	)

	return (
		<TldrawUiToolbarToggleGroup type="single" value={fairyIsSelected ? 'on' : 'off'} asChild>
			<TldrawUiToolbarToggleItem
				className="fairy-toggle-button"
				onClick={onClick}
				type="icon"
				data-state={fairyIsSelected ? 'on' : 'off'}
				data-isactive={fairyIsSelected}
				aria-label={fairyIsSelected ? deselectMessage : selectMessage}
				value="on"
			>
				<FairySpriteComponent
					pose="idle"
					outfit={{
						body: 'plain',
						hat: 'pointy',
						wings: 'plain',
					}}
				/>
			</TldrawUiToolbarToggleItem>
		</TldrawUiToolbarToggleGroup>
	)
}

export function FairyHUD({ agents }: { agents: TldrawFairyAgent[] }) {
	const editor = useEditor()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [isChatExpanded, setIsChatExpanded] = useState(false)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

	// Find the selected agent (if any) - use useValue to make it reactive
	const selectedAgent = useValue(
		'selected-fairy-agent',
		() => agents.find((agent) => agent.$fairy.get()?.isSelected),
		[agents]
	)

	// At this stage, there is only one fairy
	const onlyFairy = useValue('only-fairy', () => agents[0], [agents])

	if (!agents || agents.length === 0) return null

	const handleToggle = (agent: TldrawFairyAgent) => {
		const currentlySelected = agent.$fairy.get()?.isSelected
		// Deselect all other agents
		agents.forEach((a) => {
			if (a !== agent) {
				a.$fairy.update((f) => ({ ...f!, isSelected: false }))
			}
		})
		// Toggle the clicked agent
		agent.$fairy.update((f) => ({ ...f!, isSelected: !currentlySelected }))
	}

	const handleNewChat = () => {
		if (selectedAgent) {
			selectedAgent.cancel()
			selectedAgent.reset()
		}
	}

	const toggleChatExpanded = (e?: any) => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		setIsChatExpanded(!isChatExpanded)
	}

	const handleWheelCapture = (e: any) => {
		e.stopPropagation()
	}

	return (
		<div
			className="tla-fairy-hud"
			style={{
				position: 'fixed',
				bottom: isDebugMode ? '112px' : '72px',
				right: '6px',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-end',
				gap: '0px',
				pointerEvents: 'auto',
			}}
		>
			{isChatExpanded && (
				<div className="fairy-chat-panel" onWheelCapture={handleWheelCapture}>
					<div className="fairy-toolbar-header">
						<button
							className="fairy-toolbar-button"
							onClick={handleNewChat}
							disabled={!selectedAgent}
							title="New chat"
						>
							+
						</button>
						{selectedAgent && <div className="fairy-id-display">{selectedAgent.id}</div>}
					</div>
					<FairyChatHistory agent={onlyFairy} />
					<div className="fairy-chat-input-container">
						<FairyBasicInput agent={onlyFairy} />
					</div>
				</div>
			)}
			<div className="fairy-buttons-container">
				<div className="fairy-toolbar-stack-header">
					<button
						className="fairy-toolbar-button"
						id="fairy-toolbar-minimize-button"
						onClick={toggleChatExpanded}
						title={isChatExpanded ? 'Minimize chat' : 'Maximize chat'}
					>
						{isChatExpanded ? '←' : '→'}
					</button>
				</div>
				<TldrawUiToolbar
					label={toolbarMessage}
					style={{
						borderRadius: '0',
						boxShadow: 'none',
						display: 'flex',
						flexDirection: 'column',
						gap: '4px',
						padding: '4px',
						height: '192px',
						maxHeight: '192px',
						overflowY: 'auto',
						border: 'none',
					}}
				>
					{agents.map((agent) => {
						return (
							<FairyButton
								key={agent.id}
								agent={agent}
								onClick={() => handleToggle(agent)}
								selectMessage={selectMessage}
								deselectMessage={deselectMessage}
							/>
						)
					})}
					<button className="fairy-new-button" disabled title="Add new fairy">
						+
					</button>
				</TldrawUiToolbar>
			</div>
		</div>
	)
}
