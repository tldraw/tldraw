import { usePassThroughWheelEvents } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { TlDropdownMenuContent, TlDropdownMenuRoot, TlDropdownMenuTrigger } from '@tldraw/ui'
import { ReactNode, memo, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultHelpMenuContent } from './DefaultHelpMenuContent'

/** @public */
export interface TLUiHelpMenuProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultHelpMenu = memo(function DefaultHelpMenu({ children }: TLUiHelpMenuProps) {
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	// Get the help menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultHelpMenuContent />

	if (breakpoint < PORTRAIT_BREAKPOINT.MOBILE) return null

	return (
		<div ref={ref} className="tlui-help-menu">
			<TlDropdownMenuRoot id="help menu">
				<TlDropdownMenuTrigger>
					<TlButton type="help" title={msg('help-menu.title')} data-testid="help-menu.button">
						<TlButtonIcon icon="question-mark" small />
					</TlButton>
				</TlDropdownMenuTrigger>
				<TlDropdownMenuContent side="top" align="end" alignOffset={0} sideOffset={8}>
					<TldrawUiMenuContextProvider type="menu" sourceId="help-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</TlDropdownMenuContent>
			</TlDropdownMenuRoot>
		</div>
	)
})
