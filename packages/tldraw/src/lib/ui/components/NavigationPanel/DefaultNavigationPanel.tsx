import { usePassThroughWheelEvents } from '@tldraw/editor'
import { memo, useCallback, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { unwrapLabel, useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

/** @public @react */
export const DefaultNavigationPanel = memo(function DefaultNavigationPanel() {
	const actions = useActions()
	const msg = useTranslation()
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
			<TldrawUiToolbar orientation="horizontal" label={msg('navigation-zone.title')}>
				{ZoomMenu && breakpoint < PORTRAIT_BREAKPOINT.TABLET ? (
					<ZoomMenu />
				) : (
					<>
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
						{Minimap && (
							<TldrawUiToolbarButton
								type="icon"
								data-testid="minimap.toggle-button"
								title={msg('navigation-zone.toggle-minimap')}
								onClick={toggleMinimap}
							>
								<TldrawUiButtonIcon small icon={collapsed ? 'chevron-right' : 'chevron-left'} />
							</TldrawUiToolbarButton>
						)}
					</>
				)}
			</TldrawUiToolbar>
			{Minimap && breakpoint >= PORTRAIT_BREAKPOINT.TABLET && !collapsed && <Minimap />}
		</div>
	)
})
