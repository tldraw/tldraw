import {
	FAIRY_VARIANTS,
	FairyConfig,
	FairyProject,
	FairyTask,
	FairyVariantType,
	SmallSpinner,
} from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	tlmenus,
	uniqueId,
	useBreakpoint,
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
import { disbandProject } from './FairyProjects'
import { $fairyTasks } from './FairyTaskList'
import { FairyTaskListDropdownContent } from './FairyTaskListDropdownContent'
import { FairyTaskListInline } from './FairyTaskListInline'
import { getRandomFairyName } from './getRandomFairyName'
import { getRandomFairyPersonality } from './getRandomFairyPersonality'

function NewFairyButton({ agents, disabled }: { agents: FairyAgent[]; disabled?: boolean }) {
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
			personality: getRandomFairyPersonality(),
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
			disabled={disabled ?? agents.length >= MAX_FAIRY_COUNT}
		>
			<TldrawUiIcon icon="plus" label={newFairyLabel} />
		</TldrawUiButton>
	)
}

type PanelState = 'task-list' | 'fairy' | 'cant-chat' | 'closed'

interface FairyHUDHeaderProps {
	panelState: 'fairy' | 'task-list' | 'cant-chat'
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onToggleFairyTasks(): void
	agents: FairyAgent[]
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
	hasUnreadTasks: boolean
	switchToFairyChatLabel: string
	switchToTaskListLabel: string
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
	switchToFairyChatLabel,
	switchToTaskListLabel,
}: FairyHUDHeaderProps) {
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])
	const isGenerating = useValue('is generating', () => shownFairy?.isGenerating(), [shownFairy])

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
						visibility: isGenerating ? 'visible' : 'hidden',
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
						label={panelState === 'task-list' ? switchToFairyChatLabel : switchToTaskListLabel}
					/>
					{hasUnreadTasks && <div className="fairy-todo-unread-indicator" />}
				</TldrawUiButton>
			</div>
		</div>
	)
}

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
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

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() => agents.filter((agent) => agent.$fairyEntity.get()?.isSelected ?? false),
		[agents]
	)

	useQuickReactor(
		'cant-chat',
		() => {
			const projectSelected = selectedFairies.map((f) => f.getProject()).filter((p) => p !== null)

			const atLeastOneSingleFairySelected =
				selectedFairies.map((f) => f.getProject()).filter((p) => p === null).length > 0

			if (projectSelected.length > 1) {
				setPanelState('cant-chat')
			}

			if (projectSelected.length === 1 && atLeastOneSingleFairySelected) {
				setPanelState('cant-chat')
			}

			setPanelState('fairy')
		},
		[agents]
	)

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

	const canChat = useValue(
		'can-chat',
		() => {
			const projectSelected = selectedFairies.map((f) => f.getProject()).filter((p) => p !== null)
			const atLeastOneSingleFairySelected =
				selectedFairies.map((f) => f.getProject()).filter((p) => p === null).length > 0

			// if we have more than two projects selected, we can't chat
			if (projectSelected.length >= 2) {
				return false
			}

			// if we have one project selected and at least one single fairy selected, we can't chat
			if (projectSelected.length === 1 && atLeastOneSingleFairySelected) {
				return false
			}

			return true
		},
		[selectedFairies]
	)

	useQuickReactor(
		'update-panel-state-for-cant-chat',
		() => {
			if (!canChat) {
				setPanelState('cant-chat')
			} else if (panelState === 'cant-chat') {
				setPanelState('fairy')
			}
		},
		[canChat]
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

	const disbandProjectGroups = useCallback(() => {
		if (!selectedFairies.length) return
		const projects = selectedFairies.map((f) => f.getProject()).filter((p) => p !== null)
		projects.forEach((project) => {
			disbandProject(project, editor)
		})
	}, [selectedFairies, editor])

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

				const clickedFairyProject = clickedAgent.getProject()
				const hasGroupSelected = selectedFairies.some((f) => f.getProject() !== null)

				if (!clickedFairyProject && hasGroupSelected) {
					// Individual fairy clicked while group is selected - switch to single fairy
					selectFairy(clickedAgent)
					setPanelState('fairy')
					return
				}

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

	// hide the HUD when the mobile style panel is open
	const isMobileStylePanelOpen = useValue(
		'mobile style panel open',
		() => {
			const contextId = editor.contextId
			return tlmenus.isMenuOpen(`mobile style menu-${contextId}`)
		},
		[editor, breakpoint]
	)

	// Position HUD above mobile style menu button on mobile
	useEffect(() => {
		if (breakpoint >= PORTRAIT_BREAKPOINT.TABLET_SM) {
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
	}, [breakpoint])

	return (
		<>
			<div
				ref={hudRef}
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
				style={{
					bottom: isDebugMode ? '112px' : '72px',
					right: mobileMenuOffset !== null ? `${mobileMenuOffset}px` : '8px',
					display: isMobileStylePanelOpen ? 'none' : 'block',
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
								switchToFairyChatLabel={switchToFairyChatLabel}
								switchToTaskListLabel={switchToTaskListLabel}
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

							{panelState === 'cant-chat' && (
								<div className="fairy-cant-chat-content">
									<div className="fairy-cant-chat-content-inner">
										<p>
											<F defaultMessage="Can't talk to a team and other fairies at the same time" />
										</p>
										<button
											onClick={disbandProjectGroups}
											className="fairy-cant-chat-disband-button"
										>
											<F defaultMessage="Disband teams" />
										</button>
									</div>
								</div>
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
							renderNewFairyButton={(disabled) => (
								<NewFairyButton agents={agents} disabled={disabled} />
							)}
						/>
					</div>
				</div>
			</div>
		</>
	)
}
