import { useCallback, useState } from 'react'
import {
	Box,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useContainer,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import '../tla/styles/fairy.css'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { FairyDebugModal } from './FairyDebugModal'

import { DropdownMenu as _DropdownMenu } from 'radix-ui'

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
	agent: FairyAgent
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

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])

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
				<FairySpriteComponent pose="idle" outfit={fairyOutfit} />
			</TldrawUiToolbarToggleItem>
		</TldrawUiToolbarToggleGroup>
	)
}

type PanelState = 'closed' | 'open'

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const container = useContainer()
	const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
	const editor = useEditor()
	const { addDialog } = useDialogs()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [panelState, setPanelState] = useState<PanelState>('closed')

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

	// At this stage, there is only one fairy
	const onlyFairy = useValue('only-fairy', () => agents[0], [agents])

	const goToFairy = useCallback(() => {
		editor.zoomToBounds(Box.FromCenter(onlyFairy.$fairy.get().position, { x: 100, y: 100 }), {
			animation: { duration: 220 },
			targetZoom: 1,
		})
	}, [editor, onlyFairy])

	const handleToggle = useCallback(() => {
		if (panelState === 'closed') {
			// Open the panel
			setPanelState('open')
		} else {
			// Zoom camera to fairy position
			goToFairy()
		}
	}, [panelState, goToFairy])

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

	const openDebugModal = useCallback(() => {
		addDialog({
			component: (props) => <FairyDebugModal {...props} agents={agents} />,
			onClose() {
				// Optional: do something when the modal is closed
			},
		})
	}, [addDialog, agents])

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
						<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={setMenuPopoverOpen}>
							<_DropdownMenu.Trigger asChild dir="ltr">
								<TldrawUiButton type="icon" className="fairy-toolbar-button">
									<TldrawUiButtonIcon icon="menu" />
								</TldrawUiButton>
							</_DropdownMenu.Trigger>
							<_DropdownMenu.Portal container={container}>
								<_DropdownMenu.Content
									side="bottom"
									align="start"
									className="tlui-menu"
									collisionPadding={4}
									alignOffset={4}
									sideOffset={4}
								>
									<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
										<TldrawUiMenuGroup id="fairy-menu">
											<TldrawUiMenuItem id="go-to-fairy" onSelect={goToFairy} label="Go to fairy" />
											<TldrawUiMenuItem
												id="toggle-panel"
												onSelect={() => {
													alert('Coming soon!')
												}}
												label="Change outfit"
											/>
											<TldrawUiMenuItem id="new-chat" onSelect={handleNewChat} label="Reset chat" />
											<TldrawUiMenuItem
												id="debug-actions"
												onSelect={openDebugModal}
												label="Debug"
											/>
										</TldrawUiMenuGroup>
									</TldrawUiMenuContextProvider>
								</_DropdownMenu.Content>
							</_DropdownMenu.Portal>
						</_DropdownMenu.Root>
						<div className="fairy-id-display">{onlyFairy.id}</div>
						<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={handleNewChat}>
							+
						</TldrawUiButton>
					</div>
					<FairyChatHistory agent={onlyFairy} />
					<FairyBasicInput agent={onlyFairy} />
				</div>
			)}

			<div className="fairy-buttons-container">
				<div className="fairy-toolbar-stack-header">
					<TldrawUiButton
						type="icon"
						className="fairy-toolbar-sidebar-button"
						onClick={togglePanel}
					>
						{panelState === 'open' ? '››' : '‹‹'}
					</TldrawUiButton>
				</div>
				<TldrawUiToolbar label={toolbarMessage}>
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
