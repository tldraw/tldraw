import { useCallback, useState } from 'react'
import {
	Box,
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

type PanelState = 'closed' | 'open'

export function FairyHUD({ agents }: { agents: TldrawFairyAgent[] }) {
	const editor = useEditor()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [panelState, setPanelState] = useState<PanelState>('closed')

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

	// At this stage, there is only one fairy
	const onlyFairy = useValue('only-fairy', () => agents[0], [agents])

	const handleToggle = useCallback(() => {
		if (panelState === 'closed') {
			// Open the panel
			setPanelState('open')
		} else {
			// Zoom camera to fairy position
			const fairyPosition = onlyFairy.$fairy.get().position
			editor.zoomToBounds(Box.FromCenter(fairyPosition, { x: 100, y: 100 }), {
				animation: { duration: 220 },
				targetZoom: 1,
			})
		}
	}, [panelState, editor, onlyFairy])

	const handleNewChat = useCallback(() => {
		onlyFairy.cancel()
		onlyFairy.reset()
	}, [onlyFairy])

	const togglePanel = useCallback((e?: any) => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		// Toggle between closed and open
		setPanelState((current) => (current === 'open' ? 'closed' : 'open'))
	}, [])

	if (!agents || agents.length === 0) return null

	return (
		<div
			className={`tla-fairy-hud ${panelState === 'open' ? 'tla-fairy-hud--open' : ''}`}
			style={{
				position: 'fixed',
				bottom: isDebugMode ? '112px' : '72px',
				right: '6px',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-end',
				gap: '0px',
				pointerEvents: 'auto',
				zIndex: '99999999',
			}}
		>
			{/* Panel with two states: closed (hidden) or open (showing full panel) */}
			{panelState === 'open' && (
				<div
					className="fairy-chat-panel"
					data-panel-state={panelState}
					onWheelCapture={(e) => e.stopPropagation()}
				>
					<div className="fairy-toolbar-header">
						<button className="fairy-toolbar-button" onClick={handleNewChat} title="New chat">
							+
						</button>
						<div className="fairy-id-display">{onlyFairy.id}</div>
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
						onClick={togglePanel}
					>
						{panelState === 'open' ? '››' : '‹‹'}
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
						// maxHeight: '192px',
						overflowY: 'auto',
						border: 'none',
					}}
				>
					{agents.map((agent) => {
						return (
							<FairyButton
								key={agent.id}
								agent={agent}
								onClick={() => handleToggle()}
								selectMessage={selectMessage}
								deselectMessage={deselectMessage}
							/>
						)
					})}
				</TldrawUiToolbar>
			</div>
		</div>
	)
}
