import { useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { MobileStylePanel } from '../MobileStylePanel'
import { TldrawUiOrientationProvider } from '../primitives/layout'
import { TldrawUiToolbar } from '../primitives/TldrawUiToolbar'
import { DefaultToolbarContent } from './DefaultToolbarContent'
import { OverflowingToolbar } from './OverflowingToolbar'
import { ToggleToolLockedButton } from './ToggleToolLockedButton'

/** @public */
export interface DefaultToolbarProps {
	children?: ReactNode
	orientation?: 'horizontal' | 'vertical'
	minItems?: number
	minSizePx?: number
	maxItems?: number
	maxSizePx?: number
}

/**
 * The default toolbar for the editor. `children` defaults to the `DefaultToolbarContent` component.
 * Depending on the screen size, the children will overflow into a drop-down menu, with the most
 * recently active item from the overflow being shown in the main toolbar.
 *
 * @public
 * @react
 */
export const DefaultToolbar = memo(function DefaultToolbar({
	children,
	orientation = 'horizontal',
	minItems = 4,
	minSizePx = 310,
	maxItems = 8,
	maxSizePx = 470,
}: DefaultToolbarProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()
	const activeToolId = useValue('current tool id', () => editor.getCurrentToolId(), [editor])

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const { ActionsMenu, QuickActions } = useTldrawUiComponents()

	const showQuickActions =
		editor.options.actionShortcutsLocation === 'menu'
			? false
			: editor.options.actionShortcutsLocation === 'toolbar'
				? true
				: breakpoint < PORTRAIT_BREAKPOINT.TABLET

	return (
		<TldrawUiOrientationProvider
			orientation={orientation}
			tooltipSide={orientation === 'horizontal' ? 'top' : 'right'}
		>
			<div
				ref={ref}
				className={classNames('tlui-main-toolbar', `tlui-main-toolbar--${orientation}`)}
			>
				<div className="tlui-main-toolbar__inner">
					<div className="tlui-main-toolbar__left">
						{!isReadonlyMode && (
							<div className="tlui-main-toolbar__extras">
								{showQuickActions && (
									<TldrawUiToolbar
										orientation={orientation}
										className="tlui-main-toolbar__extras__controls"
										label={msg('actions-menu.title')}
									>
										{QuickActions && <QuickActions />}
										{ActionsMenu && <ActionsMenu />}
									</TldrawUiToolbar>
								)}
								<ToggleToolLockedButton activeToolId={activeToolId} />
							</div>
						)}
						<OverflowingToolbar
							orientation={orientation}
							sizingParentClassName="tlui-main-toolbar"
							minItems={minItems}
							maxItems={maxItems}
							minSizePx={minSizePx}
							maxSizePx={maxSizePx}
						>
							{children ?? <DefaultToolbarContent />}
						</OverflowingToolbar>
					</div>
					{breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
						<div className="tlui-main-toolbar__tools tlui-main-toolbar__mobile-style-panel">
							<MobileStylePanel />
						</div>
					)}
				</div>
			</div>
		</TldrawUiOrientationProvider>
	)
})
