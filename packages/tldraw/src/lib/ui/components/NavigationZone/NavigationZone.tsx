import { memo, useCallback } from 'react'
import { useActions } from '../../hooks/useActions'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { kbdStr } from '../primitives/shared'
import { Minimap } from './Minimap'
import { ZoomMenu } from './ZoomMenu'

/** @internal */
export const NavigationZone = memo(function NavigationZone() {
	const actions = useActions()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const [collapsed, setCollapsed] = useLocalStorageState('minimap', true)

	const toggleMinimap = useCallback(() => {
		setCollapsed((s) => !s)
	}, [setCollapsed])

	if (breakpoint < 4) {
		return null
	}

	return (
		<div className="tlui-navigation-zone">
			<div className="tlui-buttons__horizontal">
				{breakpoint < 6 ? (
					<ZoomMenu />
				) : collapsed ? (
					<>
						<ZoomMenu />
						<Button
							type="icon"
							icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'}
							data-testid="minimap.toggle"
							title={msg('navigation-zone.toggle-minimap')}
							className="tlui-navigation-zone__toggle"
							onClick={toggleMinimap}
						/>
					</>
				) : (
					<>
						<Button
							type="icon"
							icon="minus"
							data-testid="minimap.zoom-out"
							title={`${msg(actions['zoom-out'].label!)} ${kbdStr(actions['zoom-out'].kbd!)}`}
							onClick={() => actions['zoom-out'].onSelect('navigation-zone')}
						/>
						<ZoomMenu />
						<Button
							type="icon"
							icon="plus"
							data-testid="minimap.zoom-in"
							title={`${msg(actions['zoom-in'].label!)} ${kbdStr(actions['zoom-in'].kbd!)}`}
							onClick={() => actions['zoom-in'].onSelect('navigation-zone')}
						/>
						<Button
							type="icon"
							icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'}
							data-testid="minimap.toggle"
							title={msg('navigation-zone.toggle-minimap')}
							className="tlui-navigation-zone__toggle"
							onClick={toggleMinimap}
						/>
					</>
				)}
			</div>
			{breakpoint >= 6 && !collapsed && (
				<Minimap
					viewportFill="--color-muted-1"
					selectFill="--color-selected"
					shapeFill="--color-text-3"
				/>
			)}
		</div>
	)
})
