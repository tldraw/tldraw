import { defineMessages, usePassThroughWheelEvents } from '@tldraw/editor'
import { memo, useCallback, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { unwrapLabel, useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	navigationZoneTitle: { id: 'navigation-zone.title', defaultMessage: 'Navigation' },
	navigationZoneToggleMinimap: {
		id: 'navigation-zone.toggle-minimap',
		defaultMessage: 'Toggle minimap',
	},
})

/** @public @react */
export const DefaultNavigationPanel = memo(function DefaultNavigationPanel() {
	const actions = useActions()
	const msg = useTranslation()
	const dir = useDirection()
	const breakpoint = useBreakpoint()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const [collapsed, setCollapsed] = useLocalStorageState('minimap', true)

	const toggleMinimap = useCallback(() => {
		setCollapsed((s) => !s)
	}, [setCollapsed])

	const { ZoomMenu, Minimap } = useTldrawUiComponents()

	if (breakpoint < PORTRAIT_BREAKPOINT.MOBILE) {
		return null
	}

	const isRtl = dir === 'rtl'
	const minimapToggle = Minimap && (
		<TldrawUiToolbarButton
			type="icon"
			data-testid="minimap.toggle-button"
			title={msg(messages.navigationZoneToggleMinimap.id)}
			onClick={toggleMinimap}
		>
			<TldrawUiButtonIcon small icon={collapsed !== isRtl ? 'chevron-right' : 'chevron-left'} />
		</TldrawUiToolbarButton>
	)

	return (
		<div ref={ref} className="tlui-navigation-panel">
			<TldrawUiToolbar orientation="horizontal" label={msg(messages.navigationZoneTitle.id)}>
				{ZoomMenu && breakpoint < PORTRAIT_BREAKPOINT.TABLET ? (
					<ZoomMenu />
				) : (
					<>
						{isRtl && minimapToggle}
						{!collapsed && (
							<TldrawUiToolbarButton
								type="icon"
								data-testid="minimap.zoom-out"
								title={`${msg(unwrapLabel(actions['zoom-out'].label))} ${kbdStr(actions['zoom-out'].kbd!)}`}
								onClick={() => actions['zoom-out'].onSelect('navigation-zone')}
							>
								<TldrawUiButtonIcon small icon="minus" />
							</TldrawUiToolbarButton>
						)}
						{ZoomMenu && <ZoomMenu key="zoom-menu" />}
						{!collapsed && (
							<TldrawUiToolbarButton
								type="icon"
								data-testid="minimap.zoom-in"
								title={`${msg(unwrapLabel(actions['zoom-in'].label))} ${kbdStr(actions['zoom-in'].kbd!)}`}
								onClick={() => actions['zoom-in'].onSelect('navigation-zone')}
							>
								<TldrawUiButtonIcon small icon="plus" />
							</TldrawUiToolbarButton>
						)}
						{!isRtl && minimapToggle}
					</>
				)}
			</TldrawUiToolbar>
			{Minimap && breakpoint >= PORTRAIT_BREAKPOINT.TABLET && !collapsed && <Minimap />}
		</div>
	)
})
