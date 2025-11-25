import { useEffect, useState } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useBreakpoint,
	useEditor,
	useValue,
} from 'tldraw'
import '../tla/styles/fairy.css'
import { CleanFairySpriteComponent } from './fairy-sprite/FairySprite2'

// from fairyHUD.tsx
{
	/* <>
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
		</> */
}

export function FairyHUDSignedOut() {
	// should match fairy FairyHUD, but with one fairy sprite here
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [mobileMenuOffset, setMobileMenuOffset] = useState<number | null>(null)
	const isMobileStylePanelOpen = useValue(
		'mobile style panel open',
		() => editor.menus.isMenuOpen(`mobile style`),
		[editor, breakpoint]
	)

	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM

	// Position HUD above mobile style menu button on mobile
	useEffect(() => {
		if (isMobile) {
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
		<div
			className="tla-fairy-hud"
			style={{
				bottom: (isMobile ? 56 : 0) + (isDebugMode ? 88 : 8),
				right: mobileMenuOffset !== null ? `${mobileMenuOffset}px` : '8px',
				display: isMobileStylePanelOpen ? 'none' : 'block',
			}}
		>
			<div className="fairy-buttons-container">
				<div className="tla-fairy-hud-content">
					<div className="fairy-buttons-container">
						<div className="fairy-list">
							<TldrawUiToolbar label="Fairies" orientation="vertical">
								<TldrawUiToolbarToggleGroup type="single" value={'off'} asChild>
									<TldrawUiToolbarToggleItem
										className="fairy-toggle-button"
										type="icon"
										data-state={'off'}
										data-isactive={false}
										data-is-sleeping={false}
										aria-label="Select fairy"
										value="off"
									>
										<div className="fairy-sprite-wrapper">
											<CleanFairySpriteComponent />
										</div>
									</TldrawUiToolbarToggleItem>
								</TldrawUiToolbarToggleGroup>
							</TldrawUiToolbar>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// function FairyAnnouncementDialogAutoTrigger() {
// 	const { user } = useClerkUser()
// 	const { addDialog } = useDialogs()
// 	const userRef = useRef(user)
// 	const hasShownRef = useRef(false)

// 	// Keep the ref updated with the latest user
// 	useEffect(() => {
// 		userRef.current = user
// 	}, [user])

// 	useEffect(() => {
// 		function maybeShowDialog() {
// 			const currentUser = userRef.current
// 			if (currentUser && !hasShownRef.current) {
// 				hasShownRef.current = true
// 				addDialog({
// 					component: FairyComingSoonDialog,
// 				})
// 			}
// 		}

// 		maybeShowDialog()
// 	}, [addDialog, user?.id])

// 	return null
// }

// function FairyComingSoonDialog({ onClose }: { onClose(): void }) {
// 	return (
// 		<>
// 			<TldrawUiDialogHeader>
// 				<TldrawUiDialogTitle>
// 					<F defaultMessage="Fairies" />
// 				</TldrawUiDialogTitle>
// 				<TldrawUiDialogCloseButton />
// 			</TldrawUiDialogHeader>
// 			<TldrawUiDialogBody style={{ maxWidth: 300 }}>
// 				<F
// 					defaultMessage="A flutter of <b>fairies</b> is coming to tldraw for the month of December. Please check back in"
// 					values={{
// 						b: (chunks) => <b>{chunks}</b>,
// 					}}
// 				/>
// 				<TimeUntilDecember1st2025 />
// 			</TldrawUiDialogBody>
// 			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
// 				<TldrawUiButton type="primary" onClick={onClose}>
// 					<F defaultMessage="I understand" />
// 				</TldrawUiButton>
// 			</TldrawUiDialogFooter>
// 		</>
// 	)
// }

// function TimeUntilDecember1st2025() {
// 	const [timeUntilDecember1st2025, setTimeUntilDecember1st2025] = useState<number | null>(null)
// 	useEffect(() => {
// 		const december1st2025 = new Date('2025-12-01')
// 		const now = new Date()
// 		const timeDiff = december1st2025.getTime() - now.getTime()
// 		setTimeUntilDecember1st2025(timeDiff)
// 	}, [])

// 	if (!timeUntilDecember1st2025) return null

// 	const daysDiff = Math.floor(timeUntilDecember1st2025 / (1000 * 60 * 60 * 24))
// 	const hoursDiff = Math.floor(timeUntilDecember1st2025 / (1000 * 60 * 60))
// 	const minutesDiff = Math.floor(timeUntilDecember1st2025 / (1000 * 60))

// 	return (
// 		<span>
// 			{daysDiff}:{hoursDiff}:{minutesDiff}.
// 		</span>
// 	)
// }
