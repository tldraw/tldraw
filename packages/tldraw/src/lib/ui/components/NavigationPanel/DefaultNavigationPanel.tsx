import { memo, useCallback } from 'react'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { unwrapLabel, useActions } from '../../ui-context/actions'
import { useBreakpoint } from '../../ui-context/breakpoints'
import { useTldrawUiComponents } from '../../ui-context/components'
import { Button } from '../primitives/Button'
import { kbdStr } from '../primitives/shared'

/** @public */
export const DefaultNavigationPanel = memo(function DefaultNavigationPanel() {
	const actions = useActions()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const [collapsed, setCollapsed] = useLocalStorageState('minimap', true)

	const toggleMinimap = useCallback(() => {
		setCollapsed((s) => !s)
	}, [setCollapsed])

	const { ZoomMenu, Minimap } = useTldrawUiComponents()

	if (breakpoint < 4) {
		return null
	}

	return (
		<div className="tlui-navigation-panel">
			<div className="tlui-buttons__horizontal">
				{ZoomMenu && breakpoint < 6 ? (
					<ZoomMenu />
				) : collapsed ? (
					<>
						{ZoomMenu && <ZoomMenu />}
						{Minimap && (
							<Button
								type="icon"
								icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'}
								data-testid="minimap.toggle"
								title={msg('navigation-zone.toggle-minimap')}
								className="tlui-navigation-panel__toggle"
								onClick={toggleMinimap}
							/>
						)}
					</>
				) : (
					<>
						<Button
							type="icon"
							icon="minus"
							data-testid="minimap.zoom-out"
							title={`${msg(unwrapLabel(actions['zoom-out'].label))} ${kbdStr(actions['zoom-out'].kbd!)}`}
							onClick={() => actions['zoom-out'].onSelect('navigation-zone')}
						/>
						{ZoomMenu && <ZoomMenu />}
						<Button
							type="icon"
							icon="plus"
							data-testid="minimap.zoom-in"
							title={`${msg(unwrapLabel(actions['zoom-in'].label))} ${kbdStr(actions['zoom-in'].kbd!)}`}
							onClick={() => actions['zoom-in'].onSelect('navigation-zone')}
						/>
						{Minimap && (
							<Button
								type="icon"
								icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'}
								data-testid="minimap.toggle"
								title={msg('navigation-zone.toggle-minimap')}
								className="tlui-navigation-panel__toggle"
								onClick={toggleMinimap}
							/>
						)}
					</>
				)}
			</div>
			{Minimap && breakpoint >= 6 && !collapsed && <Minimap />}
		</div>
	)
})
