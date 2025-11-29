import { MouseEvent, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT, useBreakpoint, useEditor, useValue } from 'tldraw'
import '../../tla/styles/fairy.css'
import { F, useMsg } from '../../tla/utils/i18n'
import { FairyAgent } from '../fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from '../fairy-agent/chat/FairyChatHistory'
import { FairySingleChatInput } from '../fairy-agent/input/FairySingleChatInput'
import { fairyMessages } from '../fairy-messages'
import { FairyHUDHeader } from './hud/FairyHUDHeader'
import { useFairySelection } from './hud/useFairySelection'
import { useMobilePositioning } from './hud/useMobilePositioning'
import { FairyManualPanel } from './manual/FairyManualPanel'
import { FairyProjectView } from './project/FairyProjectView'
import { FairyListSidebar } from './sidebar/FairyListSidebar'

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const hudRef = useRef<HTMLDivElement>(null)

	// Use custom hooks
	const {
		panelState,
		setPanelState,
		shownFairy,
		selectedFairies,
		activeOrchestratorAgent,
		selectFairy,
		handleClickFairy,
		handleDoubleClickFairy,
		handleTogglePanel,
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

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselectFairy)
	const selectMessage = useMsg(fairyMessages.selectFairy)
	const manualLabel = useMsg(fairyMessages.manual)

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
									selectedFairies.length > 1 ? headerMenuPopoverOpen : fairyMenuPopoverOpen
								}
								onMenuPopoverOpenChange={
									selectedFairies.length > 1 ? setHeaderMenuPopoverOpen : setFairyMenuPopoverOpen
								}
								shownFairy={shownFairy}
								selectedFairies={selectedFairies}
							/>
							{panelState === 'fairy' && selectedFairies.length === 0 && !shownFairy && (
								<div className="fairy-chat-empty-message">
									<F defaultMessage="Select a fairy on the right to chat with" />
								</div>
							)}
							{/* Solo fairy mode - no project */}
							{panelState === 'fairy' &&
								selectedFairies.length <= 1 &&
								shownFairy &&
								!activeOrchestratorAgent && (
									<>
										<FairyChatHistory agent={shownFairy} />
										<FairySingleChatInput
											agent={shownFairy}
											onCancel={() => setPanelState('closed')}
										/>
									</>
								)}

							{/* Project mode - ongoing project with orchestrator */}
							{panelState === 'fairy' &&
								selectedFairies.length <= 1 &&
								shownFairy &&
								activeOrchestratorAgent && (
									<FairyProjectView
										editor={editor}
										agents={agents}
										orchestratorAgent={activeOrchestratorAgent}
										onClose={() => setPanelState('closed')}
									/>
								)}

							{/* Pre-project mode - multiple fairies selected, no project yet */}
							{panelState === 'fairy' && selectedFairies.length > 1 && (
								<FairyProjectView
									editor={editor}
									agents={selectedFairies}
									orchestratorAgent={null}
									onProjectStarted={(orchestrator) => {
										selectFairy(orchestrator)
										setPanelState('fairy')
									}}
									onClose={() => setPanelState('closed')}
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
							onTogglePanel={handleTogglePanel}
							onToggleManual={() => setPanelState((v) => (v === 'manual' ? 'closed' : 'manual'))}
						/>
					</div>
				</div>
			</div>
		</>
	)
}
