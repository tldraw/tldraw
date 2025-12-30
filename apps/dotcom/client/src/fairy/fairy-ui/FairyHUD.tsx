import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT, useBreakpoint, useDialogs, useEditor, useValue } from 'tldraw'
import '../../tla/styles/fairy.css'
import { useMsg } from '../../tla/utils/i18n'
import { FairyAppContextProvider, useFairyApp } from '../fairy-app/FairyAppProvider'
import { fairyMessages } from '../fairy-messages'
import { FairyChatHistory } from './chat/FairyChatHistory'
import { FairyFeedDialog } from './feed/FairyFeedDialog'
import { FairyHUDHeader } from './hud/FairyHUDHeader'
import { FairySingleChatInput } from './hud/FairySingleChatInput'
import { useFairySelection } from './hud/useFairySelection'
import { useMobilePositioning } from './hud/useMobilePositioning'
import { FairyManualPanel } from './manual/FairyManualPanel'
import { FairyProjectView } from './project/FairyProjectView'
import { FairyListSidebar } from './sidebar/FairyListSidebar'

const FAIRY_FEED_DIALOG_ID = 'fairy-feed-dialog'

export function FairyHUD() {
	const fairyApp = useFairyApp()
	const editor = useEditor()
	const { addDialog, removeDialog, dialogs } = useDialogs()
	const agents = useValue('fairy-agents', () => fairyApp?.agents.getAgents() ?? [], [fairyApp])
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const hudRef = useRef<HTMLDivElement>(null)
	const wasFeedDialogOpenRef = useRef(false)

	// Track if feed dialog is open
	const isFeedDialogOpen = useValue(
		'feed-dialog-open',
		() => dialogs.get().some((d) => d.id === FAIRY_FEED_DIALOG_ID),
		[dialogs]
	)

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

	// Update feed dialog state in FairyApp
	useEffect(() => {
		if (fairyApp) {
			fairyApp.setIsFeedDialogOpen(isFeedDialogOpen)
		}
	}, [fairyApp, isFeedDialogOpen])

	// Update lastSeenFeedTimestamp when the feed dialog closes
	// This ensures items viewed while the dialog was open are marked as seen
	// Also hard delete any soft deleted projects when feed closes
	useEffect(() => {
		if (wasFeedDialogOpenRef.current && !isFeedDialogOpen) {
			// Hard delete any soft deleted projects when feed closes
			if (fairyApp) {
				fairyApp.projects.hardDeleteSoftDeletedProjects()
			}
		}
		wasFeedDialogOpenRef.current = isFeedDialogOpen
	}, [isFeedDialogOpen, fairyApp])

	// Toggle feed dialog and mark as seen when opening
	const handleToggleFeed = useCallback(() => {
		if (isFeedDialogOpen) {
			removeDialog(FAIRY_FEED_DIALOG_ID)
			return
		}

		addDialog({
			id: FAIRY_FEED_DIALOG_ID,
			component: () => (
				<FairyAppContextProvider fairyApp={fairyApp}>
					<FairyFeedDialog orchestratorAgent={activeOrchestratorAgent} agents={agents} />
				</FairyAppContextProvider>
			),
		})
		return
	}, [isFeedDialogOpen, activeOrchestratorAgent, addDialog, removeDialog, agents, fairyApp])

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
								onToggleFeed={handleToggleFeed}
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
							{panelState === 'fairy-project' && shownFairy && activeOrchestratorAgent && (
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
							)}

							{/* Multi-fairy mode - multiple fairies selected (pre-project or active project) */}
							{panelState === 'fairy-multi' && (
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
