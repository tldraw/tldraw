import {
	FAIRY_VARIANTS,
	FairyConfig,
	FairyVariantType,
	SharedTodoItem,
	SmallSpinner,
} from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEvent, useCallback, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	TldrawUiToolbar,
	uniqueId,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import { MAX_FAIRY_COUNT } from '../tla/components/TlaEditor/TlaEditor'
import { useApp } from '../tla/hooks/useAppState'
import '../tla/styles/fairy.css'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { FairyDropdownContent } from './FairyDropdownContent'
import { FairyGroupChat } from './FairyGroupChat'
import { FairySidebarButton } from './FairySidebarButton'
import { getRandomFairyName } from './getRandomFairyName'
import { $sharedTodoList, $showCanvasTodos } from './SharedTodoList'
import { SharedTodoListInline } from './SharedTodoListInline'
import { TodoListDropdownContent } from './TodoListDropdownContent'
import { TodoListSidebarButton } from './TodoListSidebarButton'

const fairyMessages = defineMessages({
	toolbar: { defaultMessage: 'Fairies' },
	deselect: { defaultMessage: 'Deselect fairy' },
	select: { defaultMessage: 'Select fairy' },
})

function NewFairyButton({ agents }: { agents: FairyAgent[] }) {
	const app = useApp()
	const handleClick = useCallback(() => {
		if (!app) return
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
		const config: FairyConfig = {
			name: getRandomFairyName(),
			outfit: randomOutfit,
			personality: 'Friendly and helpful',
			wand: 'default',
		}

		// Add the config, which will trigger agent creation in FairyApp
		app.z.mutate.user.updateFairyConfig({ id, properties: config })
	}, [app])

	return (
		<TldrawUiButton
			type="icon"
			className="fairy-toolbar-sidebar-button"
			onClick={handleClick}
			disabled={agents.length >= MAX_FAIRY_COUNT}
		>
			<TldrawUiIcon icon="plus" label="New fairy" />
		</TldrawUiButton>
	)
}

type PanelState = 'todo-list' | 'fairy' | 'closed'

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
	const [todoMenuPopoverOpen, setTodoMenuPopoverOpen] = useState(false)
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
			clickedAgent.zoomTo()
			selectFairy(clickedAgent)
			setPanelState('fairy')
		},
		[selectFairy]
	)

	const [todoLastChecked, setTodoLastChecked] = useState<SharedTodoItem[]>([])

	const handleClickTodoList = useCallback(() => {
		setPanelState((v) => (v === 'todo-list' ? 'closed' : 'todo-list'))
		setTodoLastChecked($sharedTodoList.get())
	}, [])

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

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

	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasTodos.get(), [
		$showCanvasTodos,
	])

	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

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
					zIndex: '99999999',
				}}
				onContextMenu={handleContextMenu}
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
												{shownFairy && (
													<FairyDropdownContent
														agent={shownFairy}
														alignOffset={4}
														sideOffset={4}
														side="bottom"
													/>
												)}
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
												onClick={() => shownFairy?.reset()}
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
									<>
										<div className="fairy-toolbar-header">
											<div className="fairy-id-display">Group chat</div>
										</div>
										<FairyGroupChat agents={selectedFairies} />
									</>
								)}
							</>
						)}

						{/* Info View */}
						{panelState === 'todo-list' && (
							<div className="fairy-info-view">
								<div className="fairy-toolbar-header">
									<_DropdownMenu.Root
										dir="ltr"
										open={todoMenuPopoverOpen}
										onOpenChange={setTodoMenuPopoverOpen}
									>
										<_DropdownMenu.Trigger asChild dir="ltr">
											<TldrawUiButton type="icon" className="fairy-toolbar-button">
												<TldrawUiButtonIcon icon="menu" />
											</TldrawUiButton>
										</_DropdownMenu.Trigger>
										<TodoListDropdownContent
											agents={agents}
											alignOffset={4}
											sideOffset={4}
											side="bottom"
										/>
									</_DropdownMenu.Root>
									<div className="fairy-id-display">Todo list</div>
									<TldrawUiButton
										type="icon"
										className="fairy-toolbar-button"
										onClick={() => $showCanvasTodos.update((v) => !v)}
									>
										<TldrawUiIcon
											icon={showCanvasTodos ? 'toggle-on' : 'toggle-off'}
											label={showCanvasTodos ? 'Hide todos on canvas' : 'Show todos on canvas'}
										/>
									</TldrawUiButton>
								</div>
								<SharedTodoListInline agents={agents} />
							</div>
						)}
					</div>
				)}

				<div className="fairy-buttons-container">
					<div className="fairy-toolbar-stack-header">
						<TodoListSidebarButton
							onClick={handleClickTodoList}
							hasUnreadTodos={hasUnreadTodos}
							agents={agents}
						/>
					</div>
					<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
						{agents.map((agent) => {
							return (
								<FairySidebarButton
									key={agent.id}
									agent={agent}
									onClick={() => handleClickFairy(agent)}
									onDoubleClick={() => handleDoubleClickFairy(agent)}
									selectMessage={selectMessage}
									deselectMessage={deselectMessage}
								/>
							)
						})}
						<NewFairyButton agents={agents} />
					</TldrawUiToolbar>
				</div>
			</div>
		</>
	)
}
