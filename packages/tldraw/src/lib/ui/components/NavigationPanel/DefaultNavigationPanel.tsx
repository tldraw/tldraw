import { usePassThroughWheelEvents } from '@tldraw/editor'
import { TlButtonIcon } from '@tldraw/ui'
import { TlToolbar, TlToolbarButton } from '@tldraw/ui'
import { memo, useCallback, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { unwrapLabel, useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'

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

	return (
		<div ref={ref} className="tlui-navigation-panel">
			<TlToolbar orientation="horizontal" label={msg('navigation-zone.title')}>
				{ZoomMenu && breakpoint < PORTRAIT_BREAKPOINT.TABLET ? (
					<ZoomMenu />
				) : (
					<>
						{Minimap && dir === 'rtl' && (
							<TlToolbarButton
								type="icon"
								data-testid="minimap.toggle-button"
								title={msg('navigation-zone.toggle-minimap')}
								onClick={toggleMinimap}
							>
								<TlButtonIcon small icon={collapsed ? 'chevron-left' : 'chevron-right'} />
							</TlToolbarButton>
						)}
						{!collapsed && (
							<TlToolbarButton
								type="icon"
								data-testid="minimap.zoom-out"
								title={`${msg(unwrapLabel(actions['zoom-out'].label))} ${kbdStr(actions['zoom-out'].kbd!)}`}
								onClick={() => actions['zoom-out'].onSelect('navigation-zone')}
							>
								<TlButtonIcon small icon="minus" />
							</TlToolbarButton>
						)}
						{ZoomMenu && <ZoomMenu key="zoom-menu" />}
						{!collapsed && (
							<TlToolbarButton
								type="icon"
								data-testid="minimap.zoom-in"
								title={`${msg(unwrapLabel(actions['zoom-in'].label))} ${kbdStr(actions['zoom-in'].kbd!)}`}
								onClick={() => actions['zoom-in'].onSelect('navigation-zone')}
							>
								<TlButtonIcon small icon="plus" />
							</TlToolbarButton>
						)}
						{Minimap && dir !== 'rtl' && (
							<TlToolbarButton
								type="icon"
								data-testid="minimap.toggle-button"
								title={msg('navigation-zone.toggle-minimap')}
								onClick={toggleMinimap}
							>
								<TlButtonIcon small icon={collapsed ? 'chevron-right' : 'chevron-left'} />
							</TlToolbarButton>
						)}
					</>
				)}
			</TlToolbar>
			{Minimap && breakpoint >= PORTRAIT_BREAKPOINT.TABLET && !collapsed && <Minimap />}
		</div>
	)
})
