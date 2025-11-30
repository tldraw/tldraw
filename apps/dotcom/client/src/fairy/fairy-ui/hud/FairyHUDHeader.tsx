import { ReactNode, useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useReactor,
	useValue,
} from 'tldraw'
import {
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../../../tla/components/tla-menu/tla-menu'
import { F } from '../../../tla/utils/i18n'
import {
	getLocalSessionState,
	updateLocalSessionState,
} from '../../../tla/utils/local-session-state'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getProjectOrchestrator } from '../../fairy-projects'
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
	isMobile,
	onToggleManual,
}: FairyHUDHeaderProps) {
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// Get the project for the shown fairy
	const project = useValue('project', () => shownFairy?.getProject(), [shownFairy])

	// Check if the project has been started (has an orchestrator)
	const isProjectStarted = project && getProjectOrchestrator(project)

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

		shownFairy.positionManager.zoomTo()
	}, [shownFairy, fairyClickable])

	// const hasChatHistory = useValue(
	// 	'has-chat-history',
	// 	() => shownFairy && shownFairy.$chatHistory.get().length > 0,
	// 	[shownFairy]
	// )

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
				(agent) => (agent.$fairyConfig.get()?.name ?? 'fairy').split(' ')[0]
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

	const handleTabChange = useCallback((value: 'introduction' | 'usage' | 'about') => {
		updateLocalSessionState(() => ({ fairyManualActiveTab: value }))
	}, [])

	const selectAllFairies = useCallback(() => {
		allAgents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
		})
	}, [allAgents])

	if (panelState === 'manual') {
		return (
			<div className="fairy-toolbar-header">
				<TlaMenuTabsRoot activeTab={fairyManualActiveTab} onTabChange={handleTabChange}>
					<TlaMenuTabsTabs>
						<TlaMenuTabsTab id="introduction">
							<F defaultMessage="Introduction" />
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

	// Determine center content based on panel state
	const centerContent =
		selectedFairies.length > 1 ? (
			<div className="fairy-id-display">{formattedNames}</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display" onClick={zoomToFairy}>
				<p style={{ cursor: fairyClickable ? 'pointer' : 'default' }}>{getDisplayName()}</p>
			</div>
		) : (
			<div style={{ flex: 1 }}></div>
		)

	// Determine menu content based on panel state
	const dropdownContent = <FairyDropdownContent agents={selectedFairies} />

	const onlySelectedFairy = selectedFairies.length === 1 ? selectedFairies[0] : null

	// Show select all button on mobile when exactly one fairy is selected and there's more than one fairy total
	const showSelectAllButton = isMobile && selectedFairies.length < allAgents.length && !project

	return (
		<div className="fairy-toolbar-header">
			{centerContent}
			<div className="tlui-row">
				{showSelectAllButton && (
					<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={selectAllFairies}>
						<TldrawUiButtonIcon icon={<SelectAllIcon />} small />
					</TldrawUiButton>
				)}
				{onlySelectedFairy && !project && <ResetChatHistoryButton agent={onlySelectedFairy} />}
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
	return (
		<TldrawUiDropdownMenuRoot id="fairy-hud-menu" debugOpen={menuPopoverOpen}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton type="icon" className="fairy-toolbar-button">
					<TldrawUiButtonIcon icon="dots-vertical" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
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
	return (
		<TldrawUiButton
			type="icon"
			className="fairy-toolbar-button"
			// Maybe needs to be reactive
			disabled={agent.chatManager.getHistory().length === 0}
			onClick={() => {
				agent.chatManager.reset()
			}}
		>
			<TldrawUiButtonIcon icon="plus" small />
		</TldrawUiButton>
	)
}

function SelectAllIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
			<g fill="currentColor">
				<circle cx="15" cy="9" r="3" />
				<circle cx="10" cy="18" r="3" />
				<circle cx="20" cy="18" r="3" />
			</g>
		</svg>
	)
}
