import * as _Popover from '@radix-ui/react-popover'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTldrawUiComponents } from '../../../hooks/useTldrawUiComponents'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'

/** @public */
export const DefaultActionsMenu = memo(function DefaultActionsMenu() {
	const container = useContainer()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const [isOpen, onOpenChange] = useMenuIsOpen('actions-menu')

	// Get the actions menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const { ActionsMenuContent } = useTldrawUiComponents()
	if (!ActionsMenuContent) return null

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
								<ActionsMenuContent />
							</TldrawUiMenuContextProvider>
						</div>
					</_Popover.Content>
				</_Popover.Portal>
			</div>
		</_Popover.Root>
	)
})
