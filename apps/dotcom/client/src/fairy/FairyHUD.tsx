import { FairyProject, FairyTask } from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useBreakpoint,
	useEditor,
	useValue,
} from 'tldraw'
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

type PanelState = 'task-list' | 'fairy' | 'closed'

interface FairyHUDHeaderProps {
	panelState: 'fairy' | 'task-list'
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onToggleFairyTasks(): void
	onClosePanel(): void
	agents: FairyAgent[]
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
	hasUnreadTasks: boolean
	switchToFairyChatLabel: string
	switchToTaskListLabel: string
	resetChatLabel: string
}

function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClosePanel,
	agents,
	shownFairy,
	selectedFairies,
	resetChatLabel,
}: FairyHUDHeaderProps) {
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// Get the project for the shown fairy
	const project = useValue('project', () => shownFairy?.getProject(), [shownFairy])

	// Check if the project has been started (has an orchestrator)
	const isProjectStarted = project?.members.some(
		(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
	)

	const fairyClickable = useValue(
		'fairy clickable',
		() => shownFairy && (!isProjectStarted || !project),
		[isProjectStarted, project]
	)

	const zoomToFairy = useCallback(() => {
		if (!fairyClickable || !shownFairy) return

		shownFairy.zoomTo()
	}, [shownFairy, fairyClickable])

	const getDisplayName = () => {
		if (!isProjectStarted || !project) {
			return fairyConfig?.name
		}
		// Project is started - show title if available, otherwise a placeholder
		if (project.title) {
			return project.title
		}
		// Placeholder while the project name is being streamed
		return 'Planning project…'
	}

	// Determine center content based on panel state
	const centerContent =
		panelState === 'task-list' ? (
			<div className="fairy-id-display">
				<F defaultMessage="Todo list" />
			</div>
		) : selectedFairies.length > 1 ? (
			<div className="fairy-id-display">
				<F defaultMessage="New project" />
			</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display" onClick={zoomToFairy}>
				<p style={{ cursor: fairyClickable ? 'pointer' : 'default' }}>{getDisplayName()}</p>
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
						<TldrawUiButtonIcon icon="menu" small />
					</TldrawUiButton>
				</_DropdownMenu.Trigger>
				{dropdownContent}
			</_DropdownMenu.Root>

			{centerContent}

			{panelState === 'fairy' && shownFairy && selectedFairies.length <= 1 && (
				<TldrawUiButton
					type="icon"
					className="fairy-toolbar-button"
					onClick={() => shownFairy.reset()}
					title={resetChatLabel}
				>
					<TldrawUiButtonIcon icon="rotate-ccw" small />
				</TldrawUiButton>
			)}
			<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onClosePanel}>
				<TldrawUiButtonIcon icon="cross-2" small />
			</TldrawUiButton>
		</div>
	)
}

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const [todoMenuPopoverOpen, setTodoMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const [panelState, setPanelState] = useState<PanelState>('closed')
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)
	const [mobileMenuOffset, setMobileMenuOffset] = useState<number | null>(null)
	const hudRef = useRef<HTMLDivElement>(null)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselectFairy)
	const selectMessage = useMsg(fairyMessages.selectFairy)
	const switchToFairyChatLabel = useMsg(fairyMessages.switchToFairyChat)
	const switchToTaskListLabel = useMsg(fairyMessages.switchToTaskList)
	const resetChatLabel = useMsg(fairyMessages.resetChat)

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() =>
			agents.filter(
				(agent) => (agent.$fairyEntity.get()?.isSelected && !agent.isSleeping()) ?? false
			),
		[agents]
	)

	// Update the chosen fairy when the selected fairies change
	useEffect(() => {
		if (selectedFairies.length === 1) {
			setShownFairy(selectedFairies[0])
			setPanelState('fairy')
		}
		if (selectedFairies.length === 0) {
			setShownFairy(null)
			setPanelState('closed')
		}
	}, [selectedFairies])

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

	const selectProjectGroup = useCallback(
		(project: FairyProject | null) => {
			if (!project || project.members.length <= 1) {
				return false
			}

			// Check if project has an orchestrator (meaning it's been started)
			const orchestratorMember = project.members.find(
				(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
			)

			if (orchestratorMember) {
				// Project has been started, show the orchestrator's chat
				const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
				if (orchestratorAgent) {
					selectFairy(orchestratorAgent)
					setPanelState('fairy')
					return true
				}
			}

			// Project hasn't been started yet, show group creation view
			const memberIds = new Set(project.members.map((member) => member.id))

			agents.forEach((agent) => {
				const shouldSelect = memberIds.has(agent.id)
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: shouldSelect } : f))
			})

			setShownFairy(null)
			setPanelState('fairy')
			return true
		},
		[agents, setPanelState, setShownFairy, selectFairy]
	)

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === shownFairy?.id
			const project = clickedAgent.getProject()

			if (!isMultiSelect && selectProjectGroup(project)) {
				return
			}

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
					setPanelState((v) => {
						const shouldClosePanel =
							isChosen && isSelected && v === 'fairy' && selectedFairies.length <= 1
						if (shouldClosePanel) {
							agents.forEach((agent) => {
								agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
							})
						}
						return shouldClosePanel ? 'closed' : 'fairy'
					})
				}
			}
		},
		[selectFairy, shownFairy, selectedFairies, panelState, selectProjectGroup, agents]
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
		// Deselect all fairies when the panel is closed
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
		})
	}, [agents])

	const [taskListLastChecked, setTaskListLastChecked] = useState<FairyTask[]>([])

	const handleToggleHeaderMode = useCallback(() => {
		setPanelState((v) => (v === 'task-list' ? 'fairy' : 'task-list'))
		setTaskListLastChecked($fairyTasks.get())
	}, [])

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

	const currentTasks = useValue('current-tasks', () => $fairyTasks.get(), [])

	// Keep todoLastChecked in sync when the panel is open
	useEffect(() => {
		if (panelState === 'task-list') {
			setTaskListLastChecked(currentTasks)
		}
	}, [panelState, currentTasks])

	const hasUnreadTasks = useValue(
		'has-unread-tasks',
		() => {
			if (currentTasks.length !== taskListLastChecked.length) return true
			return JSON.stringify(currentTasks) !== JSON.stringify(taskListLastChecked)
		},
		[taskListLastChecked, currentTasks]
	)

	// hide the HUD when the mobile style panel is open
	const isMobileBottomToolbarsOpen = useValue(
		'mobile bottom toolbars open',
		() => {
			if (!isMobile) return false
			return (
				editor.menus.isMenuOpen(`mobile style menu`) || editor.menus.isMenuOpen(`toolbar overflow`)
			)
		},
		[editor, isMobile]
	)

	// Position HUD above mobile style menu button on mobile
	useEffect(() => {
		if (!isMobile) {
			setMobileMenuOffset(null)
			return
		}

		const updatePosition = () => {
			const mobileStyleButton = document.querySelector('[data-testid="mobile-styles.button"]')
			if (mobileStyleButton) {
				const buttonRect = mobileStyleButton.getBoundingClientRect()
				const rightOffset = window.innerWidth - buttonRect.right
				setMobileMenuOffset(rightOffset)
				return
			}
			setMobileMenuOffset(null)
		}

		updatePosition()

		window.addEventListener('resize', updatePosition)

		return () => window.removeEventListener('resize', updatePosition)
	}, [isMobile])

	return (
		<>
			<div
				ref={hudRef}
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
				style={{
					bottom: mobileMenuOffset !== null ? 64 : isDebugMode ? 48 : 8,
					right: mobileMenuOffset !== null ? mobileMenuOffset : 8,
					display: isMobileBottomToolbarsOpen ? 'none' : 'block',
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
								onClosePanel={handleTogglePanel}
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
								switchToFairyChatLabel={switchToFairyChatLabel}
								switchToTaskListLabel={switchToTaskListLabel}
								resetChatLabel={resetChatLabel}
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
						/>
					</div>
				</div>
			</div>
		</>
	)
}
