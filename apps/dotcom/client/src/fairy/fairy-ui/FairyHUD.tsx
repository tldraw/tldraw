import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT, useBreakpoint, useEditor, useValue } from 'tldraw'
import '../../tla/styles/fairy.css'
import { useMsg } from '../../tla/utils/i18n'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import { fairyMessages } from '../fairy-messages'
import { FairyChatHistory } from './chat/FairyChatHistory'
import { FairyFeedView, shouldShowInFeed } from './feed/FairyFeedView'
import { FairyHUDHeader } from './hud/FairyHUDHeader'
import { FairySingleChatInput } from './hud/FairySingleChatInput'
import { useFairySelection } from './hud/useFairySelection'
import { useMobilePositioning } from './hud/useMobilePositioning'
import { FairyManualPanel } from './manual/FairyManualPanel'
import { FairyProjectView } from './project/FairyProjectView'
import { FairyListSidebar } from './sidebar/FairyListSidebar'

export function FairyHUD() {
	const fairyApp = useFairyApp()
	const editor = useEditor()
	const agents = useValue('fairy-agents', () => fairyApp?.agents.getAgents() ?? [], [fairyApp])
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const hudRef = useRef<HTMLDivElement>(null)
	const [showFeed, setShowFeed] = useState(false)
	const [lastSeenFeedTimestamp, setLastSeenFeedTimestamp] = useState<number>(Date.now())

	// Use custom hooks
	const {
		panelState,
		handleToggleManual,
		shownFairy,
		selectedFairies,
		activeOrchestratorAgent,
		selectFairy,
		handleClickFairy,
		handleDoubleClickFairy,
	} = useFairySelection(agents)

	const { mobileMenuOffset } = useMobilePositioning(isMobile)

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

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

	// hide the panel on mobile when dragging a fairy
	const isDraggingFairy = useValue('is dragging fairy', () => editor.isIn('select.fairy-throw'), [
		editor,
	])

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselectFairy)
	const selectMessage = useMsg(fairyMessages.selectFairy)
	const manualLabel = useMsg(fairyMessages.manual)

	// Track if there are unseen feed items (new items since last viewing)
	const hasUnseenFeedItems = useValue(
		'hasUnseenFeedItems',
		() => {
			if (!activeOrchestratorAgent) return false
			const project = activeOrchestratorAgent.getProject()
			if (!project) return false

			// Check if any agent has actions newer than lastSeenFeedTimestamp
			// Use the same filtering logic as FairyFeedView to avoid false positives
			for (const agent of agents) {
				if (!project.members.some((m) => m.id === agent.id)) continue
				const history = agent.chat.getHistory()
				for (const item of history) {
					if (item.type === 'action' && item.action.complete) {
						const actionType = item.action._type
						const actionInfo = agent.actions.getActionInfo(item.action)

						// Only count as unseen if it would actually appear in the feed
						if (
							shouldShowInFeed(actionType, actionInfo) &&
							(item.timestamp ?? 0) > lastSeenFeedTimestamp
						) {
							return true
						}
					}
				}
			}
			return false
		},
		[activeOrchestratorAgent, agents, lastSeenFeedTimestamp]
	)

	// Reset to project view when a new project starts
	useEffect(() => {
		setShowFeed(false)
	}, [activeOrchestratorAgent])

	// Toggle feed and mark as seen when opening
	const handleToggleFeed = useCallback(() => {
		if (!showFeed) {
			setLastSeenFeedTimestamp(Date.now())
		}
		setShowFeed(!showFeed)
	}, [showFeed])

	return (
		<>
			<div
				ref={hudRef}
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
				style={{
					bottom:
						mobileMenuOffset !== null
							? 'calc(64px + env(safe-area-inset-bottom))'
							: isDebugMode
								? 48
								: 8,
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
							style={{
								display: isMobile && isDraggingFairy ? 'none' : undefined,
							}}
						>
							<FairyHUDHeader
								panelState={panelState}
								menuPopoverOpen={
									selectedFairies.length > 1 ? headerMenuPopoverOpen : fairyMenuPopoverOpen
								}
								onMenuPopoverOpenChange={
									selectedFairies.length > 1 ? setHeaderMenuPopoverOpen : setFairyMenuPopoverOpen
								}
								shownFairy={shownFairy}
								selectedFairies={selectedFairies}
								allAgents={agents}
								isMobile={isMobile}
								onToggleManual={handleToggleManual}
								showFeed={showFeed}
								onToggleFeed={handleToggleFeed}
								hasUnseenFeedItems={hasUnseenFeedItems}
								showLiveFeed={showFeed && panelState === 'fairy-project'}
							/>
							{/* Solo fairy mode - no project */}
							{panelState === 'fairy-solo' && shownFairy && (
								<>
									<FairyChatHistory agent={shownFairy} />
									<FairySingleChatInput
										agent={shownFairy}
										onCancel={() => {
											agents.forEach((agent) => {
												agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
											})
										}}
									/>
								</>
							)}

							{/* Project mode - ongoing project with orchestrator */}
							{panelState === 'fairy-project' &&
								shownFairy &&
								activeOrchestratorAgent &&
								(showFeed ? (
									<FairyFeedView orchestratorAgent={activeOrchestratorAgent} agents={agents} />
								) : (
									<FairyProjectView
										editor={editor}
										agents={agents}
										orchestratorAgent={activeOrchestratorAgent}
										onClose={() => {
											agents.forEach((agent) => {
												agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
											})
										}}
									/>
								))}

							{/* Multi-fairy mode - multiple fairies selected (pre-project or active project) */}
							{panelState === 'fairy-multi' && (
								// <FairyFeedView
								// 	orchestratorAgent={activeOrchestratorAgent}
								// 	agents={selectedFairies}
								// />

								<FairyProjectView
									editor={editor}
									agents={selectedFairies}
									orchestratorAgent={activeOrchestratorAgent}
									onProjectStarted={(orchestrator) => {
										selectFairy(orchestrator)
									}}
									onClose={() => {
										agents.forEach((agent) => {
											agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
										})
									}}
								/>
							)}

							{panelState === 'manual' && <FairyManualPanel />}
						</div>
					)}
					<div className="fairy-buttons-container">
						<FairyListSidebar
							agents={agents}
							panelState={panelState}
							toolbarMessage={toolbarMessage}
							selectMessage={selectMessage}
							deselectMessage={deselectMessage}
							manualLabel={manualLabel}
							onClickFairy={handleClickFairy}
							onDoubleClickFairy={handleDoubleClickFairy}
							onToggleManual={handleToggleManual}
						/>
					</div>
				</div>
			</div>
		</>
	)
}
