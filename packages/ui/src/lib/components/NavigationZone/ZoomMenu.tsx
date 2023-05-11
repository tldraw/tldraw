import { ANIMATION_MEDIUM_MS, useApp } from '@tldraw/editor'
import * as React from 'react'
import { track } from 'signia-react'
import { useActions } from '../../hooks/useActions'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import * as M from '../primitives/DropdownMenu'

export const ZoomMenu = track(function ZoomMenu() {
	const app = useApp()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const zoom = app.zoomLevel
	const hasShapes = app.shapeIds.size > 0
	const hasSelected = app.selectedIds.length > 0
	const isZoomedTo100 = app.zoomLevel === 1

	const handleDoubleClick = React.useCallback(() => {
		app.resetZoom(app.viewportScreenCenter, { duration: ANIMATION_MEDIUM_MS })
	}, [app])

	return (
		<M.Root id="zoom">
			<M.Trigger>
				<Button
					title={`${msg('navigation-zone.zoom')}`}
					data-wd="minimap.zoom-menu"
					className={breakpoint < 5 ? 'tlui-zoom-menu__button' : 'tlui-zoom-menu__button__pct'}
					onDoubleClick={handleDoubleClick}
					icon={breakpoint < 4 ? 'zoom-in' : undefined}
				>
					{breakpoint < 4 ? null : (
						<span style={{ flexGrow: 0, textAlign: 'center' }}>{Math.floor(zoom * 100)}%</span>
					)}
				</Button>
			</M.Trigger>
			<M.Content side="top" align="start" alignOffset={0}>
				<M.Group>
					<ZoomMenuItem action="zoom-in" data-wd="minimap.zoom-menu.zoom-in" noClose />
					<ZoomMenuItem action="zoom-out" data-wd="minimap.zoom-menu.zoom-out" noClose />
					<ZoomMenuItem
						action="zoom-to-100"
						data-wd="minimap.zoom-menu.zoom-to-100"
						noClose
						disabled={isZoomedTo100}
					/>
					<ZoomMenuItem
						action="zoom-to-fit"
						disabled={!hasShapes}
						data-wd="minimap.zoom-menu.zoom-to-fit"
						noClose
					/>
					<ZoomMenuItem
						action="zoom-to-selection"
						disabled={!hasSelected}
						data-wd="minimap.zoom-menu.zoom-to-selection"
						noClose
					/>
				</M.Group>
			</M.Content>
		</M.Root>
	)
})

function ZoomMenuItem(props: {
	action: string
	disabled?: boolean
	noClose?: boolean
	'data-wd'?: string
}) {
	const { action, disabled = false, noClose = false } = props
	const actions = useActions()

	return (
		<M.Item
			label={actions[action].label}
			kbd={actions[action].kbd}
			data-wd={props['data-wd']}
			onClick={() => actions[action].onSelect('zoom-menu')}
			noClose={noClose}
			disabled={disabled}
		/>
	)
}
