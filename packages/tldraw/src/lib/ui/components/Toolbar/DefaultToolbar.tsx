import { useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo, useState } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { MobileStylePanel } from '../MobileStylePanel'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultToolbarContent } from './DefaultToolbarContent'
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
 */
export const DefaultToolbar = memo(function DefaultToolbar({ children }: { children?: ReactNode }) {
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()
	const msg = useTranslation()

	const content = children ?? <DefaultToolbarContent />

	const overflowIndex = Math.min(8, 5 + breakpoint)

	const [lastActive, setLastActive] = useState<string | null>(null)

	return (
		<div className="tlui-toolbar">
			<div className="tlui-toolbar__inner">
				<div className="tlui-toolbar__left">
					<ToolbarActionsMenu />
					<div
						className={classNames('tlui-toolbar__tools', {
							'tlui-toolbar__tools__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
						})}
						role="radiogroup"
					>
						<div className="tlui-toolbar__tools__list" data-limit={overflowIndex}>
							<TldrawUiMenuContextProvider type="tools" sourceId="toolbar">
								{content}
							</TldrawUiMenuContextProvider>
						</div>
						{/* <div
							className="tlui-toolbar__tools__list tlui-toolbar__last-active"
							data-only={lastActive}
						>
							<TldrawUiMenuContextProvider type="icons" sourceId="toolbar">
								{content}
							</TldrawUiMenuContextProvider>
						</div> */}
						<TldrawUiDropdownMenuRoot id="toolbar overflow" modal={false}>
							<TldrawUiDropdownMenuTrigger>
								<TldrawUiButton
									title={msg('tool-panel.more')}
									type="tool"
									className="tlui-toolbar__overflow"
									data-testid="tools.more-button"
								>
									<TldrawUiButtonIcon icon="chevron-up" />
								</TldrawUiButton>
							</TldrawUiDropdownMenuTrigger>

							<TldrawUiDropdownMenuContent side="top" align="center">
								<div
									className="tlui-buttons__grid tlui-toolbar__tools__list-overflow"
									data-testid="tools.more-content"
									id="more"
									data-limit={overflowIndex}
								>
									<TldrawUiMenuContextProvider type="icons" sourceId="toolbar">
										{content}
									</TldrawUiMenuContextProvider>
								</div>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					</div>
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

function ToolbarActionsMenu() {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const activeToolId = useValue('current tool id', () => editor.getCurrentToolId(), [editor])
	const isReadonlyMode = useReadonly()
	const { ActionsMenu, QuickActions } = useTldrawUiComponents()

	if (isReadonlyMode) return null

	return (
		<div className="tlui-toolbar__extras">
			{breakpoint < PORTRAIT_BREAKPOINT.TABLET && (
				<div className="tlui-toolbar__extras__controls tlui-buttons__horizontal">
					{QuickActions && <QuickActions />}
					{ActionsMenu && <ActionsMenu />}
				</div>
			)}
			<ToggleToolLockedButton activeToolId={activeToolId} />
		</div>
	)
}
