import { useEditor, useValue } from '@tldraw/editor'
import { ReactNode, memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { useTldrawUiOrientation } from '../primitives/layout'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { DefaultActionsMenuContent } from './DefaultActionsMenuContent'

/** @public */
export interface TLUiActionsMenuProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultActionsMenu = memo(function DefaultActionsMenu({
	children,
}: TLUiActionsMenuProps) {
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()
	const { orientation } = useTldrawUiOrientation()

	const editor = useEditor()
	const isInAcceptableReadonlyState = useValue(
		'should display quick actions when in readonly',
		() => editor.isInAny('hand', 'zoom'),
		[editor]
	)

	if (isReadonlyMode && !isInAcceptableReadonlyState) return

	const content = children ?? <DefaultActionsMenuContent />

	return (
		<TldrawUiPopover id="actions-menu">
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					type="icon"
					data-testid="actions-menu.button"
					title={msg('actions-menu.title')}
				>
					<TldrawUiButtonIcon
						icon={orientation === 'horizontal' ? 'dots-vertical' : 'dots-horizontal'}
						small
					/>
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side={
					orientation === 'horizontal'
						? breakpoint >= PORTRAIT_BREAKPOINT.TABLET
							? 'bottom'
							: 'top'
						: 'right'
				}
				sideOffset={6}
			>
				<TldrawUiToolbar
					label={msg('actions-menu.title')}
					className="tlui-actions-menu"
					data-testid="actions-menu.content"
					orientation="grid"
				>
					<TldrawUiMenuContextProvider type="icons" sourceId="actions-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
})
