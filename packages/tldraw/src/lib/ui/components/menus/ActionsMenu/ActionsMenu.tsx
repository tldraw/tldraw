import * as _Popover from '@radix-ui/react-popover'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import tunnel from '../../../tunnel'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'
import { DefaultActionsMenu } from './DefaultActionsMenu'

const _ActionsMenuContent = tunnel(<DefaultActionsMenu />)

/** @public */
export const CustomActionsMenu = _ActionsMenuContent.In

/** @public */
export const ActionsMenu = memo(function ActionsMenu() {
	const container = useContainer()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const [isOpen, onOpenChange] = useMenuIsOpen('actions-menu')

	return (
		<_Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<div className="tlui-popover">
				<_Popover.Trigger asChild dir="ltr">
					<Button
						className="tlui-menu__trigger"
						data-testid="main.action-menu"
						icon="dots-vertical"
						title={msg('actions-menu.title')}
						type="icon" // needs to be here because the trigger also passes down type="button"
						smallIcon
					/>
				</_Popover.Trigger>
				<_Popover.Portal container={container}>
					<_Popover.Content
						className="tlui-popover__content"
						side={breakpoint >= 6 ? 'bottom' : 'top'}
						dir="ltr"
						sideOffset={6}
					>
						<div className="tlui-actions-menu tlui-buttons__grid">
							<TldrawUiMenuContextProvider type="actions" sourceId="actions-menu">
								<_ActionsMenuContent.Out />
							</TldrawUiMenuContextProvider>
						</div>
					</_Popover.Content>
				</_Popover.Portal>
			</div>
		</_Popover.Root>
	)
})
