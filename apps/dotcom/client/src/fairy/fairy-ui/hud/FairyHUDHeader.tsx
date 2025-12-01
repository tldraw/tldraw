import { ReactNode, useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiTooltip,
	useEditor,
	useReactor,
	useValue,
} from 'tldraw'
import {
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../../../tla/components/tla-menu/tla-menu'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { F, useMsg } from '../../../tla/utils/i18n'
import {
	getLocalSessionState,
	updateLocalSessionState,
} from '../../../tla/utils/local-session-state'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { fairyMessages } from '../../fairy-messages'
import { FairyMenuContent } from '../menus/FairyMenuContent'
import { FairyHUDPanelState } from './useFairySelection'

interface FairyHUDHeaderProps {
	panelState: FairyHUDPanelState
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
	allAgents: FairyAgent[]
	isMobile: boolean
	onToggleManual?(): void
}

export function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	shownFairy,
	selectedFairies,
	allAgents,
	onToggleManual,
}: FairyHUDHeaderProps) {
	const fairyApp = useFairyApp()
	const trackEvent = useTldrawAppUiEvents()
	const fairyConfig = useValue('fairy config', () => shownFairy?.getConfig(), [shownFairy])
	const zoomToFairyLabel = useMsg(fairyMessages.zoomToFairy)
	const selectAllFairiesLabel = useMsg(fairyMessages.selectAllFairiesLabel)

	// Get the project for the shown fairy
	const project = useValue('project', () => shownFairy?.getProject(), [shownFairy])

	// Check if the project has been started (has an orchestrator)
	const isProjectStarted = project && fairyApp && fairyApp.projects.getProjectOrchestrator(project)

	const fairyClickable = useValue(
		'fairy clickable',
		() => shownFairy && (!isProjectStarted || !project),
		[isProjectStarted, project]
	)

	const editor = useEditor()

	useReactor(
		'fairy-hud-menu',
		() => {
			const menuIsOpen = editor.menus.isMenuOpen('fairy-hud-menu')
			onMenuPopoverOpenChange(menuIsOpen)
		},
		[editor, onMenuPopoverOpenChange]
	)

	const zoomToFairy = useCallback(() => {
		if (!fairyClickable || !shownFairy) return

		trackEvent('fairy-zoom-to', { source: 'fairy-panel', fairyId: shownFairy.id })
		shownFairy.position.zoomTo()
	}, [shownFairy, fairyClickable, trackEvent])

	const hasChatHistory = useValue(
		'has-chat-history',
		() => shownFairy && shownFairy.chat.getHistory().length > 0,
		[shownFairy]
	)

	// Check if there are unselected fairies without active projects
	const hasUnselectedFairiesWithoutActiveProjects = useValue(
		'unselected-fairies-without-active-projects',
		() => {
			if (!fairyApp) return false
			const selectedIds = new Set(selectedFairies.map((f) => f.id))
			const unselectedFairies = allAgents.filter((agent) => !selectedIds.has(agent.id))

			return unselectedFairies.some((agent) => {
				const agentProject = agent.getProject()
				if (!agentProject) return true // No project means available
				// Check if project has an orchestrator (is active)
				const orchestrator = fairyApp.projects.getProjectOrchestrator(agentProject)
				return !orchestrator // No orchestrator means not active
			})
		},
		[allAgents, selectedFairies, fairyApp]
	)

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

	// Format names for pre-project header
	const formattedNames = useValue(
		'formatted-fairy-names',
		() => {
			const names = selectedFairies.map(
				(agent) => (agent.getConfig()?.name ?? 'fairy').split(' ')[0]
			)
			if (names.length === 0) return ''
			if (names.length === 1) return `${names[0]}`
			if (names.length === 2) return `${names[0]} and ${names[1]}`
			return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
		},
		[selectedFairies]
	)

	const fairyManualActiveTab = useValue(
		'fairy manual active tab',
		() => getLocalSessionState().fairyManualActiveTab,
		[]
	)

	const handleTabChange = useCallback(
		(value: 'introduction' | 'usage' | 'about') => {
			trackEvent('fairy-switch-manual-tab', { source: 'fairy-panel', tab: value })
			updateLocalSessionState(() => ({ fairyManualActiveTab: value }))
		},
		[trackEvent]
	)

	const selectAllFairies = useCallback(() => {
		trackEvent('fairy-select-all', { source: 'fairy-panel' })
		allAgents.forEach((agent) => {
			agent.updateEntity((f) => (f ? { ...f, isSelected: true } : f))
		})
	}, [allAgents, trackEvent])

	if (panelState === 'manual') {
		return (
			<div className="fairy-toolbar-header">
				<TlaMenuTabsRoot activeTab={fairyManualActiveTab} onTabChange={handleTabChange}>
					<TlaMenuTabsTabs>
						<TlaMenuTabsTab id="introduction">
							<F defaultMessage="Welcome" />
						</TlaMenuTabsTab>
						<TlaMenuTabsTab id="usage">
							<F defaultMessage="Usage" />
						</TlaMenuTabsTab>
						<TlaMenuTabsTab id="about">
							<F defaultMessage="About" />
						</TlaMenuTabsTab>
					</TlaMenuTabsTabs>
				</TlaMenuTabsRoot>
				<div className="tlui-row">
					<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onToggleManual}>
						<TldrawUiButtonIcon icon="cross-2" small />
					</TldrawUiButton>
				</div>
			</div>
		)
	}

	// Get display name for multi-fairy header (pre-project or active project)
	const getProjectDisplayName = () => {
		// Active project with a title
		if (isProjectStarted && project?.title) {
			return project.title
		}
		// Active project being planned (no title yet)
		if (isProjectStarted) {
			return 'Planning project…'
		}
		// Pre-project state (multiple fairies selected, no project started yet)
		return formattedNames
	}

	// Determine center content based on panel state
	const centerContent =
		selectedFairies.length > 1 ? (
			<div className="fairy-id-display">{getProjectDisplayName()}</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display" onClick={zoomToFairy}>
				<TldrawUiTooltip content={fairyClickable ? zoomToFairyLabel : undefined} side="top">
					<span style={{ cursor: fairyClickable ? 'pointer' : 'default' }}>{getDisplayName()}</span>
				</TldrawUiTooltip>
			</div>
		) : (
			<div style={{ flex: 1 }}></div>
		)

	// Determine menu content based on panel state
	const dropdownContent = <FairyDropdownContent agents={selectedFairies} />

	const onlySelectedFairy = selectedFairies.length === 1 ? selectedFairies[0] : null

	// Show select all button when there are unselected fairies without active projects
	const showSelectAllButton =
		hasUnselectedFairiesWithoutActiveProjects && !project && !hasChatHistory // && isMobile

	return (
		<div className="fairy-toolbar-header">
			{centerContent}
			<div className="tlui-row">
				{showSelectAllButton ? (
					<TldrawUiTooltip content={selectAllFairiesLabel} side="top">
						<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={selectAllFairies}>
							<TldrawUiButtonIcon icon={<SelectAllIcon />} small />
						</TldrawUiButton>
					</TldrawUiTooltip>
				) : (
					onlySelectedFairy &&
					hasChatHistory &&
					!isProjectStarted && <ResetChatHistoryButton agent={onlySelectedFairy} />
				)}
				{<FairyMenuButton menuPopoverOpen={menuPopoverOpen}>{dropdownContent}</FairyMenuButton>}
			</div>
		</div>
	)
}

function FairyMenuButton({
	menuPopoverOpen,
	children,
}: {
	menuPopoverOpen: boolean
	children: ReactNode
}) {
	const moreOptionsLabel = useMsg(fairyMessages.moreOptions)
	return (
		<TldrawUiDropdownMenuRoot id="fairy-hud-menu" debugOpen={menuPopoverOpen}>
			<TldrawUiTooltip content={moreOptionsLabel} side="top">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="icon" className="fairy-toolbar-button">
						<TldrawUiButtonIcon icon="dots-vertical" small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
			</TldrawUiTooltip>
			{children}
		</TldrawUiDropdownMenuRoot>
	)
}

function FairyDropdownContent({ agents }: { agents: FairyAgent[] }) {
	return (
		<TldrawUiDropdownMenuContent
			align="start"
			className="fairy-sidebar-dropdown"
			alignOffset={4}
			sideOffset={4}
			side="bottom"
		>
			<FairyMenuContent agents={agents} menuType="menu" source="chat" />
		</TldrawUiDropdownMenuContent>
	)
}

function ResetChatHistoryButton({ agent }: { agent: FairyAgent }) {
	const trackEvent = useTldrawAppUiEvents()
	const newChatLabel = useMsg(fairyMessages.newChat)
	return (
		<TldrawUiTooltip content={newChatLabel} side="top">
			<TldrawUiButton
				type="icon"
				className="fairy-toolbar-button"
				// Maybe needs to be reactive
				disabled={agent.chat.getHistory().length === 0}
				onClick={() => {
					trackEvent('fairy-reset-chat', { source: 'fairy-panel', fairyId: agent.id })
					// Cancel any active generation before resetting the chat
					agent.cancel()
					agent.chat.reset()
				}}
			>
				<TldrawUiButtonIcon icon="plus" small />
			</TldrawUiButton>
		</TldrawUiTooltip>
	)
}

function SelectAllIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
			<g fill="currentColor">
				<circle cx="15" cy="9" r="2.5" />
				<circle cx="10" cy="18" r="2.5" />
				<circle cx="20" cy="18" r="2.5" />
			</g>
		</svg>
	)
}
