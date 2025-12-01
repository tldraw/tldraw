import { useCallback, useEffect, useState } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useBreakpoint,
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
		if (!isLoaded) return

		if (!flags.fairies.enabled) return

		if (!flags.fairies_purchase.enabled) return

		trackEvent('click-fairy-teaser', { source: 'fairy-teaser' })
		window.location.href = '/pricing'
	}, [isLoaded, flags.fairies.enabled, flags.fairies_purchase.enabled, trackEvent])

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
