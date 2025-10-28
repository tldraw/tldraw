import {
	FAIRY_VARIANTS,
	FairyVariantType,
	SharedTodoItem,
	SmallSpinner,
} from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback, useState } from 'react'
import {
	Box,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	uniqueId,
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
import { FairyConfigDialog } from './FairyConfigDialog'
import { $sharedTodoList, clearSharedTodoList } from './SharedTodoList'
import { SharedTodoListInline } from './SharedTodoListInline'

const fairyMessages = defineMessages({
	toolbar: { defaultMessage: 'Fairies' },
	deselect: { defaultMessage: 'Deselect fairy' },
	select: { defaultMessage: 'Select fairy' },
})

function FairyButton({
	agent,
	onClick,
	onDoubleClick,
	selectMessage,
	deselectMessage,
}: {
	agent: FairyAgent
	onClick(): void
	onDoubleClick(): void
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
				onDoubleClick={onDoubleClick}
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

function NewFairyButton({
	agents,
	onAddFairyConfig,
}: {
	agents: FairyAgent[]
	onAddFairyConfig(id: string, config: any): void
}) {
	const handleClick = useCallback(() => {
		const randomOutfit = {
			body: Object.keys(FAIRY_VARIANTS.body)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.body).length)
			] as FairyVariantType<'body'>,
			hat: Object.keys(FAIRY_VARIANTS.hat)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.hat).length)
			] as FairyVariantType<'hat'>,
			wings: Object.keys(FAIRY_VARIANTS.wings)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.wings).length)
			] as FairyVariantType<'wings'>,
		}

		// Create a unique ID for the new fairy
		const id = uniqueId()

		// Create the config for the new fairy
		const config = {
			name: 'New Fairy ' + `${agents.length + 1}`,
			outfit: randomOutfit,
			personality: 'Friendly and helpful',
			wand: 'god',
		}

		// Add the config, which will trigger agent creation in FairyApp
		onAddFairyConfig(id, config)
	}, [onAddFairyConfig, agents.length])

	return (
		<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={handleClick}>
			<TldrawUiIcon icon="plus" label="New fairy" />
		</TldrawUiButton>
	)
}

type PanelState = 'todo-list' | 'fairy' | 'closed'

export function FairyHUD({
	agents,
	onAddFairyConfig,
	onDeleteFairyConfig,
}: {
	agents: FairyAgent[]
	onAddFairyConfig(id: string, config: any): void
	onDeleteFairyConfig(id: string): void
}) {
	const editor = useEditor()
	const { addDialog } = useDefaultHelpers()
	const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const [panelState, setPanelState] = useState<PanelState>('closed')
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

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
				setShownFairy(currentSelectedFairies[0])
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

	const configureFairy = useCallback(() => {
		if (!shownFairy) return

		addDialog({
			component: ({ onClose }) => <FairyConfigDialog agent={shownFairy} onClose={onClose} />,
		})
	}, [addDialog, shownFairy])

	const summonFairy = useCallback(
		(agent: FairyAgent) => {
			const position = editor.getViewportPageBounds().center
			agent.$fairyEntity.update((f) => (f ? { ...f, position, gesture: 'poof' } : f))
		},
		[editor]
	)

	const requestHelpFromEveryone = useCallback(() => {
		agents.forEach((agent) => {
			agent.helpOut()
		})
	}, [agents])

	const resetChat = useCallback(() => {
		if (shownFairy) {
			shownFairy.cancel()
			shownFairy.reset()
		}
	}, [shownFairy])

	const selectFairy = useCallback(
		(selectedAgent: FairyAgent) => {
			// Select the specified fairy
			selectedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))

			// Deselect all other fairies
			agents.forEach((agent) => {
				if (agent.id === selectedAgent.id) return
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
			})
		},
		[agents]
	)

	const deleteFairy = useCallback(() => {
		if (!shownFairy) return

		setPanelState('closed')

		if (agents.length === 1) {
			//set shown fairy to null if you've jsut deleted the last fairy
			setShownFairy(null)
		}

		// Delete the fairy config (which will trigger disposal in FairyApp)
		onDeleteFairyConfig(shownFairy.id)
	}, [shownFairy, onDeleteFairyConfig, agents.length])

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			selectFairy(clickedAgent)
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === shownFairy?.id

			selectFairy(clickedAgent)

			// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
			setPanelState((v) => (isChosen && isSelected && v === 'fairy' ? 'closed' : 'fairy'))
		},
		[selectFairy, shownFairy]
	)

	const handleDoubleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			goToFairy(clickedAgent)
			selectFairy(clickedAgent)
			setPanelState('fairy')
		},
		[goToFairy, selectFairy]
	)

	const [todoLastChecked, setTodoLastChecked] = useState<SharedTodoItem[]>([])

	const handleClickTodoList = useCallback(() => {
		setPanelState((v) => (v === 'todo-list' ? 'closed' : 'todo-list'))
		setTodoLastChecked($sharedTodoList.get())
	}, [])

	// Keep todoLastChecked in sync when the panel is open
	useQuickReactor(
		'update-todo-last-checked',
		() => {
			if (panelState === 'todo-list') {
				setTodoLastChecked($sharedTodoList.get())
			}
		},
		[panelState]
	)

	const hasUnreadTodos = useValue(
		'has-unread-todos',
		() => {
			const currentList = $sharedTodoList.get()
			if (currentList.length !== todoLastChecked.length) return true
			return JSON.stringify(currentList) !== JSON.stringify(todoLastChecked)
		},
		[todoLastChecked]
	)

	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// if (!agents || agents.length === 0) return null

	return (
		<>
			<div
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
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
				{panelState !== 'closed' && (
					<div
						className="fairy-chat-panel"
						data-panel-state="open"
						onWheelCapture={(e) => e.stopPropagation()}
					>
						{/* Conversation View */}
						{panelState === 'fairy' && (
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
																onSelect={() => (shownFairy ? goToFairy(shownFairy) : undefined)}
																label="Go to fairy"
															/>
															<TldrawUiMenuItem
																id="help-out"
																onSelect={() => (shownFairy ? shownFairy.helpOut() : undefined)}
																label="Ask for help"
															/>
															<TldrawUiMenuItem
																id="summon-fairy"
																onSelect={() => (shownFairy ? summonFairy(shownFairy) : undefined)}
																label="Summon"
															/>
															<TldrawUiMenuItem
																id="configure-fairy"
																onSelect={configureFairy}
																label="Customize"
															/>
															<TldrawUiMenuItem
																id="new-chat"
																onSelect={resetChat}
																label="Reset chat"
															/>
															<TldrawUiMenuItem
																id="delete-fairy"
																onSelect={deleteFairy}
																label="Delete fairy"
															/>
														</TldrawUiMenuGroup>
													</TldrawUiMenuContextProvider>
												</_DropdownMenu.Content>
											</_DropdownMenu.Root>
											<div className="fairy-id-display">
												{shownFairy && fairyConfig && (
													<>
														{fairyConfig.name}
														<div
															className="fairy-spinner-container"
															style={{
																visibility: shownFairy.isGenerating() ? 'visible' : 'hidden',
															}}
														>
															<SmallSpinner />
														</div>
													</>
												)}
											</div>
											<TldrawUiButton
												type="icon"
												className="fairy-toolbar-button"
												onClick={resetChat}
											>
												<TldrawUiIcon icon="plus" label="Reset chat" />
											</TldrawUiButton>
										</div>
										{shownFairy && (
											<>
												<FairyChatHistory agent={shownFairy} />
												<FairyBasicInput
													agent={shownFairy}
													onCancel={() => setPanelState('closed')}
												/>
											</>
										)}
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
						{panelState === 'todo-list' && (
							<div className="fairy-info-view">
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
														id="ask-for-help-from-everyone"
														onSelect={requestHelpFromEveryone}
														label="Request help from everyone"
													/>
												</TldrawUiMenuGroup>
												<TldrawUiMenuItem
													id="clear-todo-list"
													onSelect={() => clearSharedTodoList()}
													label="Clear list"
												/>
											</TldrawUiMenuContextProvider>
										</_DropdownMenu.Content>
									</_DropdownMenu.Root>
									<div className="fairy-id-display">Todo list</div>
									<TldrawUiButton
										type="icon"
										className="fairy-toolbar-button"
										onClick={requestHelpFromEveryone}
									>
										<TldrawUiIcon icon="geo-arrow-up" label="Request help from everyone" />
									</TldrawUiButton>
								</div>
								<SharedTodoListInline agents={agents} />
							</div>
						)}
					</div>
				)}

				<div className="fairy-buttons-container">
					<div className="fairy-toolbar-stack-header">
						{/* <TldrawUiButton
							type="icon"
							className="fairy-toolbar-sidebar-button"
							onClick={() => setPanelState((v) => (v === 'closed' ? 'todo-list' : 'closed'))}
						>
							{panelState === 'closed' ? '‹‹' : '››'}
						</TldrawUiButton> */}
						<div style={{ position: 'relative' }}>
							<TldrawUiButton
								type="icon"
								className="fairy-toolbar-sidebar-button"
								onClick={handleClickTodoList}
							>
								<TldrawUiIcon icon="clipboard-copied" label="Todo list" />
							</TldrawUiButton>
							{hasUnreadTodos && <div className="fairy-todo-unread-indicator" />}
						</div>
					</div>
					<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
						{agents.map((agent) => {
							return (
								<FairyButton
									key={agent.id}
									agent={agent}
									onClick={() => handleClickFairy(agent)}
									onDoubleClick={() => handleDoubleClickFairy(agent)}
									selectMessage={selectMessage}
									deselectMessage={deselectMessage}
								/>
							)
						})}
						<NewFairyButton agents={agents} onAddFairyConfig={onAddFairyConfig} />
					</TldrawUiToolbar>
				</div>
			</div>
		</>
	)
}
