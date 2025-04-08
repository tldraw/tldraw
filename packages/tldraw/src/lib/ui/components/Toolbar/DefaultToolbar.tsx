import { useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import { ReactNode, memo, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useReadonly } from '../../hooks/useReadonly'
import { MobileStylePanel } from '../MobileStylePanel'
import { DefaultToolbarContent } from './DefaultToolbarContent'
import { OverflowingToolbar } from './OverflowingToolbar'
import { ToggleToolLockedButton } from './ToggleToolLockedButton'

/** @public */
export interface DefaultToolbarProps {
	children?: ReactNode
}

/**
 * The default toolbar for the editor. `children` defaults to the `DefaultToolbarContent` component.
 * Depending on the screen size, the children will overflow into a drop-down menu, with the most
 * recently active item from the overflow being shown in the main toolbar.
 *
 * @public
 * @react
 */
export const DefaultToolbar = memo(function DefaultToolbar({ children }: DefaultToolbarProps) {
	const editor = useEditor()
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
		<div ref={ref} className="tlui-toolbar" role="toolbar">
			<div className="tlui-toolbar__inner">
				<div className="tlui-toolbar__left">
					{!isReadonlyMode && (
						<div className="tlui-toolbar__extras">
							{showQuickActions && (
								<div className="tlui-toolbar__extras__controls tlui-buttons__horizontal">
									{QuickActions && <QuickActions />}
									{ActionsMenu && <ActionsMenu />}
								</div>
							)}
							<ToggleToolLockedButton activeToolId={activeToolId} />
						</div>
					)}
					<OverflowingToolbar>{children ?? <DefaultToolbarContent />}</OverflowingToolbar>
				</div>
				{breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
					<div className="tlui-toolbar__tools">
						<MobileStylePanel />
					</div>
				)}
			</div>
		</div>
	)
})
