import {
	FAIRY_VARIANTS,
	FairyConfig,
	FairyTask,
	FairyVariantType,
	SmallSpinner,
} from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEvent, useCallback, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	uniqueId,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import { MAX_FAIRY_COUNT } from '../tla/components/TlaEditor/TlaEditor'
import { useApp } from '../tla/hooks/useAppState'
import '../tla/styles/fairy.css'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { fairyMessages } from './fairy-messages'
import { FairyGroupChat } from './FairyGroupChat'
import { FairyListSidebar } from './FairyListSidebar'
import { FairyMenuContent } from './FairyMenuContent'
import { $fairyTasks } from './FairyTaskList'
import { FairyTaskListDropdownContent } from './FairyTaskListDropdownContent'
import { FairyTaskListInline } from './FairyTaskListInline'
import { FairyTaskListMenuContent } from './FairyTaskListMenuContent'
import { getRandomFairyName } from './getRandomFairyName'

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
		}

		// Add the config, which will trigger agent creation in FairyApp
		app.z.mutate.user.updateFairyConfig({ id, properties: config })
	}, [app])

	const newFairyLabel = useMsg(fairyMessages.newFairy)

	return (
		<TldrawUiButton
			type="icon"
			className="fairy-toolbar-sidebar-button"
			onClick={handleClick}
			disabled={agents.length >= MAX_FAIRY_COUNT}
		>
			<TldrawUiIcon icon="plus" label={newFairyLabel} />
		</TldrawUiButton>
	)
}

type PanelState = 'todo-list' | 'fairy' | 'closed'

interface FairyHUDHeaderProps {
	panelState: 'fairy' | 'todo-list'
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onToggleFairyTodo(): void
	agents: FairyAgent[]
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
}

function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onToggleFairyTodo,
	agents,
	shownFairy,
	selectedFairies,
}: FairyHUDHeaderProps) {
	const editor = useEditor()
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// Determine center content based on panel state
	const centerContent =
		panelState === 'todo-list' ? (
			<div className="fairy-id-display">
				<F defaultMessage="Todo list" />
			</div>
		) : selectedFairies.length > 1 ? (
			<div className="fairy-id-display">
				<F defaultMessage="Group chat" />
			</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display">
				{fairyConfig.name}
				<div
					className="fairy-spinner-container"
					style={{
						visibility: shownFairy.isGenerating() ? 'visible' : 'hidden',
					}}
				>
					<SmallSpinner />
				</div>
			</div>
		) : (
			<div style={{ flex: 1 }}></div>
		)

	// Determine menu content based on panel state
	const menuContent =
		panelState === 'todo-list' ? (
			<FairyTaskListDropdownContent agents={agents} alignOffset={4} sideOffset={4} side="bottom" />
		) : shownFairy && selectedFairies.length <= 1 ? (
			<_DropdownMenu.Portal container={editor.getContainer()}>
				<_DropdownMenu.Content
					side="bottom"
					align="start"
					className="tlui-menu fairy-sidebar-dropdown"
					collisionPadding={4}
					alignOffset={4}
					sideOffset={4}
					onClick={(e) => e.stopPropagation()}
					style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
				>
					<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
						<FairyMenuContent agent={shownFairy} menuType="menu" />
					</TldrawUiMenuContextProvider>
				</_DropdownMenu.Content>
			</_DropdownMenu.Portal>
		) : (
			<_DropdownMenu.Portal container={editor.getContainer()}>
				<_DropdownMenu.Content
					side="bottom"
					align="start"
					className="tlui-menu fairy-sidebar-dropdown"
					collisionPadding={4}
					alignOffset={4}
					sideOffset={4}
					onClick={(e) => e.stopPropagation()}
					style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
				>
					<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
						<TldrawUiMenuGroup id="todo-list-menu">
							<FairyTaskListMenuContent agents={agents} menuType="menu" />
						</TldrawUiMenuGroup>
					</TldrawUiMenuContextProvider>
				</_DropdownMenu.Content>
			</_DropdownMenu.Portal>
		)

	return (
		<div className="fairy-toolbar-header">
			<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={onMenuPopoverOpenChange}>
				<_DropdownMenu.Trigger asChild dir="ltr">
					<TldrawUiButton type="icon" className="fairy-toolbar-button">
						<TldrawUiButtonIcon icon="menu" />
					</TldrawUiButton>
				</_DropdownMenu.Trigger>
				{menuContent}
			</_DropdownMenu.Root>

			{centerContent}

			<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onToggleFairyTodo}>
				<TldrawUiIcon
					icon={panelState === 'todo-list' ? 'toggle-on' : 'toggle-off'}
					label={panelState === 'todo-list' ? 'Switch to fairy chat' : 'Switch to todo list'}
				/>
			</TldrawUiButton>
		</div>
	)
}

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const [todoMenuPopoverOpen, setTodoMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const [panelState, setPanelState] = useState<PanelState>('closed')
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselectFairy)
	const selectMessage = useMsg(fairyMessages.selectFairy)
	// const resetChatLabel = useMsg(fairyMessages.resetChat)
	// const showTasksOnCanvas = useMsg(fairyMessages.showTasksOnCanvas)
	// const hideTasksOnCanvas = useMsg(fairyMessages.hideTasksOnCanvas)

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
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === shownFairy?.id

			if (isMultiSelect) {
				// Toggle selection without deselecting others
				clickedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: !isSelected } : f))
				// Keep panel open if there are selected fairies
				if (!isSelected || selectedFairies.length > 1) {
					setPanelState('fairy')
				}
			} else {
				// Single select mode - deselect all others
				selectFairy(clickedAgent)
				// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
				setPanelState((v) =>
					isChosen && isSelected && v === 'fairy' && selectedFairies.length <= 1
						? 'closed'
						: 'fairy'
				)
			}
		},
		[selectFairy, shownFairy, selectedFairies]
	)

	const handleDoubleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			clickedAgent.zoomTo()
			selectFairy(clickedAgent)
			setPanelState('fairy')
		},
		[selectFairy]
	)

	const handleTogglePanel = useCallback(() => {
		setPanelState((v) => {
			if (v === 'todo-list') return 'closed'
			if (v === 'fairy') return 'closed'
			return 'fairy' // closed -> fairy
		})
	}, [])

	const [_todoLastChecked, setTodoLastChecked] = useState<FairyTask[]>([])

	const handleToggleHeaderMode = useCallback(() => {
		setPanelState((v) => (v === 'todo-list' ? 'fairy' : 'todo-list'))
		setTodoLastChecked($fairyTasks.get())
	}, [])

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

	// Keep todoLastChecked in sync when the panel is open
	useQuickReactor(
		'update-todo-last-checked',
		() => {
			if (panelState === 'todo-list') {
				setTodoLastChecked($fairyTasks.get())
			}
		},
		[panelState]
	)

	// const hasUnreadTodos = useValue(
	// 	'has-unread-todos',
	// 	() => {
	// 		const currentList = $fairyTasks.get()
	// 		if (currentList.length !== todoLastChecked.length) return true
	// 		return JSON.stringify(currentList) !== JSON.stringify(todoLastChecked)
	// 	},
	// 	[todoLastChecked]
	// )

	// const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasFairyTasks.get(), [
	// 	$showCanvasFairyTasks,
	// ])

	// const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	return (
		<>
			<div
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
				style={{
					bottom: isDebugMode ? '112px' : '72px',
				}}
				onContextMenu={handleContextMenu}
			>
				<div className="tla-fairy-hud-content">
					{panelState !== 'closed' && (
						<div
							className="fairy-chat-panel"
							data-panel-state="open"
							onWheelCapture={(e) => e.stopPropagation()}
						>
							<FairyHUDHeader
								panelState={panelState}
								menuPopoverOpen={
									panelState === 'todo-list'
										? todoMenuPopoverOpen
										: selectedFairies.length > 1
											? headerMenuPopoverOpen
											: fairyMenuPopoverOpen
								}
								onMenuPopoverOpenChange={
									panelState === 'todo-list'
										? setTodoMenuPopoverOpen
										: selectedFairies.length > 1
											? setHeaderMenuPopoverOpen
											: setFairyMenuPopoverOpen
								}
								onToggleFairyTodo={handleToggleHeaderMode}
								agents={agents}
								shownFairy={shownFairy}
								selectedFairies={selectedFairies}
							/>
							{panelState === 'fairy' && selectedFairies.length === 0 && !shownFairy && (
								<div className="fairy-chat-empty-message">
									<F defaultMessage="Select a fairy on the right to chat with" />
								</div>
							)}
							{panelState === 'fairy' &&
								selectedFairies.length <= 1 &&
								shownFairy && ( // if there's a shown fairy, still show the chat history and input even if the user deselects it
									<>
										<FairyChatHistory agent={shownFairy} />
										<FairyBasicInput agent={shownFairy} onCancel={() => setPanelState('closed')} />
									</>
								)}

							{panelState === 'fairy' && selectedFairies.length > 1 && (
								<FairyGroupChat agents={selectedFairies} />
							)}

							{panelState === 'todo-list' && <FairyTaskListInline agents={agents} />}
						</div>
					)}

					<div className="fairy-buttons-container">
						{/* <div className="fairy-toolbar-stack-header">
							<FairyTaskListSidebarButton
								onClick={handleClickTodoList}
								hasUnreadTasks={hasUnreadTodos}
								agents={agents}
							/>
						</div> */}
						{/* <TldrawUiToolbar label={toolbarMessage} orientation="vertical">
							{agents.map((agent) => {
								return (
									<FairySidebarButton
										key={agent.id}
										agent={agent}
										onClick={(e) => handleClickFairy(agent, e)}
										onDoubleClick={() => handleDoubleClickFairy(agent)}
										selectMessage={selectMessage}
										deselectMessage={deselectMessage}
									/>
								)
							})}
							<NewFairyButton agents={agents} />
						</TldrawUiToolbar> */}
						<FairyListSidebar
							agents={agents}
							panelState={panelState}
							toolbarMessage={toolbarMessage}
							selectMessage={selectMessage}
							deselectMessage={deselectMessage}
							onClickFairy={handleClickFairy}
							onDoubleClickFairy={handleDoubleClickFairy}
							onTogglePanel={handleTogglePanel}
							newFairyButton={<NewFairyButton agents={agents} />}
						/>
					</div>
					{/* <FairyListSidebar
						agents={agents}
						panelState={panelState}
						toolbarMessage={toolbarMessage}
						selectMessage={selectMessage}
						deselectMessage={deselectMessage}
						onClickFairy={handleClickFairy}
						onDoubleClickFairy={handleDoubleClickFairy}
						onTogglePanel={handleTogglePanel}
						newFairyButton={<NewFairyButton agents={agents} />}
					/> */}
				</div>
			</div>
		</>
	)
}
