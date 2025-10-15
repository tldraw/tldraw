import { useCallback, useState } from 'react'
import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useEditor,
	useValue,
} from 'tldraw'
import '../tla/styles/fairy.css'
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

	// At this stage, there is only one fairy
	const onlyFairy = useValue('only-fairy', () => agents[0], [agents])

	const handleToggle = useCallback(
		(agent: TldrawFairyAgent) => {
			const currentlySelected = agent.$fairy.get()?.isSelected
			// Deselect all other agents
			agents.forEach((a) => {
				if (a !== agent) {
					a.$fairy.update((f) => ({ ...f!, isSelected: false }))
				}
			})
			// Toggle the clicked agent
			agent.$fairy.update((f) => ({ ...f!, isSelected: !currentlySelected }))
		},
		[agents]
	)

	const handleNewChat = useCallback(() => {
		if (onlyFairy) {
			onlyFairy.cancel()
			onlyFairy.reset()
		}
	}, [onlyFairy])

	const toggleChatExpanded = useCallback(
		(e?: any) => {
			if (e) {
				e.preventDefault()
				e.stopPropagation()
			}
			setIsChatExpanded(!isChatExpanded)
		},
		[isChatExpanded]
	)

	if (!agents || agents.length === 0) return null

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
				<div className="fairy-chat-panel" onWheelCapture={(e) => e.stopPropagation()}>
					<div className="fairy-toolbar-header">
						<button className="fairy-toolbar-button" onClick={handleNewChat} title="New chat">
							+
						</button>
						{<div className="fairy-id-display">{onlyFairy.id}</div>}
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
