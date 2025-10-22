import { useCallback, useEffect, useState } from 'react'
import {
	Box,
	react,
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

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() => {
			return agents.filter((agent) => agent.$fairy.get()?.isSelected ?? false)
		},
		[agents]
	)

	// Single selected fairy for operations
	const singleSelectedFairy = selectedFairies.length === 1 ? selectedFairies[0] : null

	// Close panel when no fairies are selected
	useEffect(() => {
		return react('close-panel-on-deselect', () => {
			const currentSelectedCount = agents.filter(
				(agent) => agent.$fairy.get()?.isSelected ?? false
			).length

			if (currentSelectedCount === 0) {
				setPanelState('closed')
			}
		})
	}, [agents])

	const goToFairy = useCallback(
		(fairy: FairyAgent) => {
			editor.zoomToBounds(Box.FromCenter(fairy.$fairy.get().position, { x: 100, y: 100 }), {
				animation: { duration: 220 },
				targetZoom: 1,
			})
		},
		[editor]
	)

	const handleToggle = useCallback(
		(clickedAgent: FairyAgent) => {
			const isClickedAgentSelected = clickedAgent.$fairy.get()?.isSelected ?? false

			if (!isClickedAgentSelected) {
				// Deselect all fairies
				agents.forEach((agent) => {
					agent.$fairy.update((f) => (f ? { ...f, isSelected: false } : f))
				})
				// Select the clicked fairy
				clickedAgent.$fairy.update((f) => (f ? { ...f, isSelected: true } : f))
				// Open the panel
				setPanelState('open')
			} else {
				// If already selected, zoom to fairy or toggle panel
				if (panelState === 'closed') {
					setPanelState('open')
				} else {
					goToFairy(clickedAgent)
				}
			}
		},
		[panelState, goToFairy, agents]
	)

	const handleNewChat = useCallback(() => {
		if (singleSelectedFairy) {
			singleSelectedFairy.cancel()
			singleSelectedFairy.reset()
		}
	}, [singleSelectedFairy])

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
					{/* Handle 0 fairies selected */}
					{selectedFairies.length === 0 && (
						<div className="fairy-no-selection" style={{ padding: '20px', textAlign: 'center' }}>
							<p>No fairy selected</p>
							<p>Click a fairy button below to select one</p>
						</div>
					)}

					{/* Handle 1 fairy selected */}
					{singleSelectedFairy && (
						<>
							<div className="fairy-toolbar-header">
								<_DropdownMenu.Root
									dir="ltr"
									open={menuPopoverOpen}
									onOpenChange={setMenuPopoverOpen}
								>
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
													<TldrawUiMenuItem
														id="go-to-fairy"
														onSelect={() => goToFairy(singleSelectedFairy)}
														label="Go to fairy"
													/>
													<TldrawUiMenuItem
														id="toggle-panel"
														onSelect={() => {
															alert('Coming soon!')
														}}
														label="Change outfit"
													/>
													<TldrawUiMenuItem
														id="new-chat"
														onSelect={handleNewChat}
														label="Reset chat"
													/>
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
								<div className="fairy-id-display">
									{singleSelectedFairy.$fairyConfig.get().name}
								</div>
								<TldrawUiButton
									type="icon"
									className="fairy-toolbar-button"
									onClick={handleNewChat}
								>
									+
								</TldrawUiButton>
							</div>
							<FairyChatHistory agent={singleSelectedFairy} />
							<FairyBasicInput agent={singleSelectedFairy} />
						</>
					)}

					{/* Handle 2+ fairies selected */}
					{selectedFairies.length > 1 && (
						<div className="fairy-no-selection" style={{ padding: '20px', textAlign: 'center' }}>
							<p>Multiple fairies selected</p>
							<p>Group chat coming soon!</p>
						</div>
					)}
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
				<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
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
				</TldrawUiToolbar>
			</div>
		</div>
	)
}
