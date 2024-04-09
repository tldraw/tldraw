import { memo, useCallback } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { unwrapLabel, useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

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

	if (breakpoint < PORTRAIT_BREAKPOINT.MOBILE) {
		return null
	}

	return (
		<div className="tlui-navigation-panel">
			<div className="tlui-buttons__horizontal">
				{ZoomMenu && breakpoint < PORTRAIT_BREAKPOINT.TABLET ? (
					<ZoomMenu />
				) : collapsed ? (
					<>
						{ZoomMenu && <ZoomMenu />}
						{Minimap && (
							<TldrawUiButton
								type="icon"
								data-testid="minimap.toggle-button"
								title={msg('navigation-zone.toggle-minimap')}
								className="tlui-navigation-panel__toggle"
								onClick={toggleMinimap}
							>
								<TldrawUiButtonIcon icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'} />
							</TldrawUiButton>
						)}
					</>
				) : (
					<>
						<TldrawUiButton
							type="icon"
							data-testid="minimap.zoom-out"
							title={`${msg(unwrapLabel(actions['zoom-out'].label))} ${kbdStr(actions['zoom-out'].kbd!)}`}
							onClick={() => actions['zoom-out'].onSelect('navigation-zone')}
						>
							<TldrawUiButtonIcon icon="minus" />
						</TldrawUiButton>
						{ZoomMenu && <ZoomMenu />}
						<TldrawUiButton
							type="icon"
							data-testid="minimap.zoom-in"
							title={`${msg(unwrapLabel(actions['zoom-in'].label))} ${kbdStr(actions['zoom-in'].kbd!)}`}
							onClick={() => actions['zoom-in'].onSelect('navigation-zone')}
						>
							<TldrawUiButtonIcon icon="plus" />
						</TldrawUiButton>
						{Minimap && (
							<TldrawUiButton
								type="icon"
								data-testid="minimap.toggle-button"
								title={msg('navigation-zone.toggle-minimap')}
								className="tlui-navigation-panel__toggle"
								onClick={toggleMinimap}
							>
								<TldrawUiButtonIcon icon={collapsed ? 'chevrons-ne' : 'chevrons-sw'} />
							</TldrawUiButton>
						)}
					</>
				)}
			</div>
			{Minimap && breakpoint >= PORTRAIT_BREAKPOINT.TABLET && !collapsed && <Minimap />}
		</div>
	)
})
