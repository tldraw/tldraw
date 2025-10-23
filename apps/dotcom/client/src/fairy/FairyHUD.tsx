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
	useDefaultHelpers,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import '../tla/styles/fairy.css'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { SharedTodoListInline } from './SharedTodoListInline'

import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { FairyConfigDialog } from './FairyConfigDialog'

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
		() => agent.$fairyEntity.get()?.isSelected ?? false,
		[agent]
	)

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])

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
				<FairySpriteComponent entity={fairyEntity} outfit={fairyOutfit} animated={true} />
			</TldrawUiToolbarToggleItem>
		</TldrawUiToolbarToggleGroup>
	)
}

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
	const editor = useEditor()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [isPanelOpen, setIsPanelOpen] = useState(false)
	const [viewMode, setViewMode] = useState<'conversation' | 'info'>('conversation')
	const { addDialog } = useDefaultHelpers()

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

	const [chosenFairy, setChosenFairy] = useState<FairyAgent>(agents[0])

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() => agents.filter((agent) => agent.$fairyEntity.get()?.isSelected ?? false),
		[agents]
	)

	// Update the chosen fairy when the selected fairies change
	useQuickReactor(
		'update-chosen-fairy',
		() => {
			const currentSelectedFairies = agents.filter(
				(agent) => agent.$fairyEntity.get()?.isSelected ?? false
			)
			if (currentSelectedFairies.length === 1) {
				setChosenFairy(currentSelectedFairies[0])
			}
		},
		[agents]
	)

	const goToFairy = useCallback(
		(fairy: FairyAgent) => {
			editor.zoomToBounds(Box.FromCenter(fairy.$fairyEntity.get().position, { x: 100, y: 100 }), {
				animation: { duration: 220 },
				targetZoom: 1,
			})
		},
		[editor]
	)

	const handleToggle = useCallback(
		(clickedAgent: FairyAgent) => {
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === chosenFairy.id

			// Select the clicked fairy
			clickedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))

			// Deselect all other fairies
			agents.forEach((agent) => {
				if (agent.id === clickedAgent.id) return
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
			})

			// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
			setIsPanelOpen((v) => (isChosen && isSelected ? !v : true))
		},
		[agents, chosenFairy.id]
	)

	const handleNewChat = useCallback(() => {
		if (chosenFairy) {
			chosenFairy.cancel()
			chosenFairy.reset()
		}
	}, [chosenFairy])

	const handleConfigureFairy = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <FairyConfigDialog agent={chosenFairy} onClose={onClose} />,
		})
	}, [addDialog, chosenFairy])

	const togglePanel = useCallback((e?: any) => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		// Toggle between closed and open
		setIsPanelOpen((current) => !current)
	}, [])

	const toggleViewMode = useCallback(
		(e?: any) => {
			if (e) {
				e.preventDefault()
				e.stopPropagation()
			}
			// If panel is closed, open it instead of toggling view mode
			if (!isPanelOpen) {
				setIsPanelOpen(true)
			} else {
				// Panel is open, so toggle the view mode
				setViewMode((current) => (current === 'conversation' ? 'info' : 'conversation'))
			}
		},
		[isPanelOpen]
	)

	const summonFairy = useCallback(
		(agent: FairyAgent) => {
			const position = editor.getViewportPageBounds().center
			agent.$fairyEntity.update((f) => (f ? { ...f, position, gesture: 'poof' } : f))
		},
		[editor]
	)

	if (!agents || agents.length === 0) return null

	return (
		<>
			<div
				className={`tla-fairy-hud ${isPanelOpen ? 'tla-fairy-hud--open' : ''}`}
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
				{isPanelOpen && (
					<div
						className="fairy-chat-panel"
						data-panel-state={isPanelOpen ? 'open' : 'closed'}
						onWheelCapture={(e) => e.stopPropagation()}
					>
						{/* Conversation View */}
						{viewMode === 'conversation' && (
							<>
								{/* Handle 1 fairy selected */}
								{selectedFairies.length <= 1 && (
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
																onSelect={() => goToFairy(chosenFairy)}
																label="Go to fairy"
															/>
															<TldrawUiMenuItem
																id="summon-fairy"
																onSelect={() => summonFairy(chosenFairy)}
																label="Summon fairy"
															/>
															<TldrawUiMenuItem
																id="configure-fairy"
																onSelect={handleConfigureFairy}
																label="Configure fairy"
															/>
															<TldrawUiMenuItem
																id="new-chat"
																onSelect={handleNewChat}
																label="Reset chat"
															/>
															<TldrawUiMenuItem
																id="help-out"
																onSelect={() => chosenFairy.helpOut()}
																label="Request help"
															/>
														</TldrawUiMenuGroup>
													</TldrawUiMenuContextProvider>
												</_DropdownMenu.Content>
											</_DropdownMenu.Root>
											<div className="fairy-id-display">{chosenFairy?.$fairyConfig.get().name}</div>
											<TldrawUiButton
												type="icon"
												className="fairy-toolbar-button"
												onClick={handleNewChat}
											>
												+
											</TldrawUiButton>
										</div>
										<FairyChatHistory agent={chosenFairy} />
										<FairyBasicInput agent={chosenFairy} onCancel={() => setIsPanelOpen(false)} />
									</>
								)}

								{/* Handle 2+ fairies selected */}
								{selectedFairies.length > 1 && (
									<div
										className="fairy-no-selection"
										style={{ padding: '20px', textAlign: 'center' }}
									>
										<p>Multiple fairies selected</p>
										<p>Group chat coming soon!</p>
									</div>
								)}
							</>
						)}

						{/* Info View */}
						{viewMode === 'info' && (
							<div className="fairy-info-view">
								<div className="fairy-toolbar-header">
									<div className="fairy-id-display">Fairy todo list</div>
								</div>
								<SharedTodoListInline agents={agents} />
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
							{isPanelOpen ? '››' : '‹‹'}
						</TldrawUiButton>
						<TldrawUiButton
							type="icon"
							className="fairy-toolbar-sidebar-button"
							onClick={toggleViewMode}
							title={viewMode === 'conversation' ? 'Show Info' : 'Show Conversation'}
						>
							{viewMode === 'conversation' ? 'ℹ' : '💬'}
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
		</>
	)
}
