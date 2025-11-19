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
import { FairyDropdownContent } from './FairyDropdownContent'
import { FairyGroupChat } from './FairyGroupChat'
import { FairyListSidebar } from './FairyListSidebar'
import { $fairyTasks } from './FairyTaskList'
import { FairyTaskListDropdownContent } from './FairyTaskListDropdownContent'
import { FairyTaskListInline } from './FairyTaskListInline'
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

type PanelState = 'task-list' | 'fairy' | 'closed'

interface FairyHUDHeaderProps {
	panelState: 'fairy' | 'task-list'
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onToggleFairyTasks(): void
	agents: FairyAgent[]
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
	hasUnreadTasks: boolean
}

function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onToggleFairyTasks,
	agents,
	shownFairy,
	selectedFairies,
	hasUnreadTasks,
}: FairyHUDHeaderProps) {
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// Determine center content based on panel state
	const centerContent =
		panelState === 'task-list' ? (
			<div className="fairy-id-display">
				<F defaultMessage="Todo list" />
			</div>
		) : selectedFairies.length > 1 ? (
			<div className="fairy-id-display">
				<F defaultMessage="Create project" />
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
	const dropdownContent =
		panelState === 'task-list' ? (
			<FairyTaskListDropdownContent agents={agents} alignOffset={4} sideOffset={4} side="bottom" />
		) : shownFairy && selectedFairies.length <= 1 ? (
			<FairyDropdownContent agent={shownFairy} alignOffset={4} sideOffset={4} side="bottom" />
		) : (
			<FairyTaskListDropdownContent agents={agents} alignOffset={4} sideOffset={4} side="bottom" />
		)

	return (
		<div className="fairy-toolbar-header">
			<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={onMenuPopoverOpenChange}>
				<_DropdownMenu.Trigger asChild dir="ltr">
					<TldrawUiButton type="icon" className="fairy-toolbar-button">
						<TldrawUiButtonIcon icon="menu" />
					</TldrawUiButton>
				</_DropdownMenu.Trigger>
				{dropdownContent}
			</_DropdownMenu.Root>

			{centerContent}

			<div style={{ position: 'relative' }}>
				<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onToggleFairyTasks}>
					<TldrawUiIcon
						icon={panelState === 'task-list' ? 'toggle-on' : 'toggle-off'}
						label={panelState === 'task-list' ? 'Switch to fairy chat' : 'Switch to task list'}
					/>
					{hasUnreadTasks && <div className="fairy-todo-unread-indicator" />}
				</TldrawUiButton>
			</div>
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
				// Single select mode
				if (selectedFairies.length > 1 && panelState !== 'fairy') {
					// Multiple fairies already selected, panel not open - keep them all selected and show group chat
					setShownFairy(clickedAgent)
					setPanelState('fairy')
				} else if (selectedFairies.length > 1 && panelState === 'fairy') {
					// Multiple fairies selected, panel already open in group chat - switch to single fairy mode
					selectFairy(clickedAgent)
					setPanelState('fairy')
				} else {
					// Normal single select behavior - deselect all others
					selectFairy(clickedAgent)
					// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
					setPanelState((v) =>
						isChosen && isSelected && v === 'fairy' && selectedFairies.length <= 1
							? 'closed'
							: 'fairy'
					)
				}
			}
		},
		[selectFairy, shownFairy, selectedFairies, panelState]
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
			if (v === 'task-list') return 'closed'
			if (v === 'fairy') return 'closed'
			return 'fairy' // closed -> fairy
		})
	}, [])

	const [taskListLastChecked, setTaskListLastChecked] = useState<FairyTask[]>([])

	const handleToggleHeaderMode = useCallback(() => {
		setPanelState((v) => (v === 'task-list' ? 'fairy' : 'task-list'))
		setTaskListLastChecked($fairyTasks.get())
	}, [])

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

	// Keep todoLastChecked in sync when the panel is open
	useQuickReactor(
		'update-task-list-last-checked',
		() => {
			if (panelState === 'task-list') {
				setTaskListLastChecked($fairyTasks.get())
			}
		},
		[panelState]
	)

	const hasUnreadTasks = useValue(
		'has-unread-tasks',
		() => {
			const currentList = $fairyTasks.get()
			if (currentList.length !== taskListLastChecked.length) return true
			return JSON.stringify(currentList) !== JSON.stringify(taskListLastChecked)
		},
		[taskListLastChecked]
	)

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
									panelState === 'task-list'
										? todoMenuPopoverOpen
										: selectedFairies.length > 1
											? headerMenuPopoverOpen
											: fairyMenuPopoverOpen
								}
								onMenuPopoverOpenChange={
									panelState === 'task-list'
										? setTodoMenuPopoverOpen
										: selectedFairies.length > 1
											? setHeaderMenuPopoverOpen
											: setFairyMenuPopoverOpen
								}
								onToggleFairyTasks={handleToggleHeaderMode}
								agents={agents}
								shownFairy={shownFairy}
								selectedFairies={selectedFairies}
								hasUnreadTasks={hasUnreadTasks}
							/>
							{panelState === 'fairy' && selectedFairies.length === 0 && !shownFairy && (
								<div className="fairy-chat-empty-message">
									<F defaultMessage="Select a fairy on the right to chat with" />
								</div>
							)}
							{panelState === 'fairy' &&
								selectedFairies.length <= 1 &&
								shownFairy && ( // if there's a single shown fairy, still show the chat history and input even if the user deselects it
									<>
										<FairyChatHistory agent={shownFairy} />
										<FairyBasicInput agent={shownFairy} onCancel={() => setPanelState('closed')} />
									</>
								)}

							{panelState === 'fairy' && selectedFairies.length > 1 && (
								<FairyGroupChat
									agents={selectedFairies}
									onStartProject={(orchestratorAgent) => {
										selectFairy(orchestratorAgent)
										setPanelState('fairy')
									}}
								/>
							)}

							{panelState === 'task-list' && <FairyTaskListInline agents={agents} />}
						</div>
					)}

					<div className="fairy-buttons-container">
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
				</div>
			</div>
		</>
	)
}
