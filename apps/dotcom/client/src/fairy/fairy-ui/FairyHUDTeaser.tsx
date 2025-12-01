import { useCallback, useEffect, useRef, useState } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useBreakpoint,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import {
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../../tla/components/tla-menu/tla-menu'
import { useFeatureFlags } from '../../tla/hooks/useFeatureFlags'
import '../../tla/styles/fairy.css'
import { useTldrawAppUiEvents } from '../../tla/utils/app-ui-events'
import { F, useMsg } from '../../tla/utils/i18n'
import { getLocalSessionState, updateLocalSessionState } from '../../tla/utils/local-session-state'
import { fairyMessages } from '../fairy-messages'
import { FairySprite } from '../fairy-sprite/FairySprite'
import { FairyManualPanel } from './manual/FairyManualPanel'

export function FairyHUDTeaser() {
	// should match fairy FairyHUD, but with one fairy sprite here
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const breakpoint = useBreakpoint()
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])
	const [mobileMenuOffset, setMobileMenuOffset] = useState<number | null>(null)
	const [isManualOpen, setIsManualOpen] = useState(false)

	const isMobileStylePanelOpen = useValue(
		'mobile style panel open',
		() => editor.menus.isMenuOpen(`mobile style menu`),
		[editor, breakpoint]
	)

	const { flags, isLoaded } = useFeatureFlags()
	const { addDialog } = useDialogs()

	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const manualLabel = useMsg(fairyMessages.manual)

	const fairyManualActiveTab = useValue(
		'fairy manual active tab',
		() => getLocalSessionState().fairyManualActiveTab,
		[]
	)

	const handleTabChange = useCallback(
		(value: 'introduction' | 'usage' | 'about') => {
			trackEvent('fairy-switch-manual-tab', { source: 'fairy-teaser', tab: value })
			updateLocalSessionState(() => ({ fairyManualActiveTab: value }))
		},
		[trackEvent]
	)

	const handleToggleManual = useCallback(() => {
		const wasOpen = isManualOpen
		if (wasOpen) {
			trackEvent('fairy-close-manual', { source: 'fairy-teaser' })
		} else {
			trackEvent('fairy-switch-to-manual', { source: 'fairy-teaser' })
		}
		setIsManualOpen(!wasOpen)
	}, [trackEvent, isManualOpen])

	const handleFairyClick = useCallback(() => {
		trackEvent('click-fairy-teaser', { source: 'fairy-teaser' })
		if (!isLoaded) return

		if (!flags.fairies.enabled || !flags.fairies_purchase.enabled) {
			addDialog({
				component: FairyComingSoonDialog,
			})
			return
		}

		window.location.href = '/pricing'
	}, [isLoaded, flags.fairies.enabled, flags.fairies_purchase.enabled, trackEvent, addDialog])

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
		<div
			className={`tla-fairy-hud ${isManualOpen ? 'tla-fairy-hud--open' : ''}`}
			style={{
				bottom: mobileMenuOffset !== null ? 64 : isDebugMode ? 48 : 8,
				right: mobileMenuOffset === null ? 8 : mobileMenuOffset,
				display: isMobileStylePanelOpen ? 'none' : 'block',
			}}
		>
			<div className="tla-fairy-hud-content">
				{isManualOpen && (
					<div
						className="fairy-chat-panel"
						data-panel-state="open"
						onWheelCapture={(e) => e.stopPropagation()}
					>
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
								<TldrawUiButton
									type="icon"
									className="fairy-toolbar-button"
									onClick={handleToggleManual}
								>
									<TldrawUiButtonIcon icon="cross-2" small />
								</TldrawUiButton>
							</div>
						</div>
						<FairyManualPanel />
					</div>
				)}
				<div className="fairy-buttons-container">
					<div className="fairy-list">
						<TldrawUiToolbar label="Fairies" orientation="vertical">
							<TldrawUiToolbarToggleGroup type="single" value={isManualOpen ? 'manual' : 'off'}>
								<TldrawUiToolbarToggleItem
									className="fairy-manual-button"
									type="icon"
									value="manual"
									data-state={isManualOpen ? 'on' : 'off'}
									data-isactive={isManualOpen}
									onClick={handleToggleManual}
									title={manualLabel}
									aria-label={manualLabel}
								>
									<TldrawUiButtonIcon icon="manual" />
								</TldrawUiToolbarToggleItem>
								<TldrawUiToolbarToggleItem
									className="fairy-toggle-button"
									type="icon"
									data-state={'off'}
									data-isactive={false}
									data-is-sleeping={true}
									aria-label="Fairies"
									value="off"
									onClick={handleFairyClick}
								>
									<FairySprite
										pose={'sleeping'}
										hatColor={'var(--tl-color-fairy-light)'}
										isAnimated={false}
										showShadow
									/>
								</TldrawUiToolbarToggleItem>
							</TldrawUiToolbarToggleGroup>
						</TldrawUiToolbar>
					</div>
				</div>
			</div>
		</div>
	)
}

function FairyComingSoonDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Fairies" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 300 }}>
				<F defaultMessage="A flutter of fairies is coming to tldraw for the month of December. Please check back on December 1st." />
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TimeUntilDecember1st2025 />
				<TldrawUiButton type="primary" onClick={onClose}>
					<F defaultMessage="I understand" />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

const LAUNCH_TIME = new Date('2025-12-01T00:00:00Z')

function TimeUntilDecember1st2025() {
	const rTime = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function updateTime() {
			const elm = rTime.current
			if (!elm) return
			// utc time
			const timeDiff = LAUNCH_TIME.getTime() - Date.now()

			const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
			const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60)) % 24
			const minutesDiff = Math.floor(timeDiff / (1000 * 60)) % 60
			const secondsDiff = Math.floor(timeDiff / 1000) % 60

			// pad out to 2 digits
			const daysDiffStr = daysDiff.toString().padStart(2, '0')
			const hoursDiffStr = hoursDiff.toString().padStart(2, '0')
			const minutesDiffStr = minutesDiff.toString().padStart(2, '0')
			const secondsDiffStr = secondsDiff.toString().padStart(2, '0')

			elm.textContent = `${daysDiffStr}:${hoursDiffStr}:${minutesDiffStr}:${secondsDiffStr}`
		}
		updateTime()
		const interval = setInterval(updateTime, 1000)
		return () => clearInterval(interval)
	}, [])

	return (
		<div
			ref={rTime}
			style={{
				flex: 1,
				textAlign: 'left',
				paddingLeft: 'var(--tl-space-4)',
				color: 'var(--tl-color-text-3)',
				fontFamily: 'var(--tl-font-mono)',
			}}
		/>
	)
}
