import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import { Button } from '../primitives/Button'
import {
	DropdownMenuContent,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from '../primitives/DropdownMenu'
import { DefaultDebugMenuContent } from './DefaultDebugMenuContent'

/** @public */
export type TLUiDebugMenuProps = {
	children?: any
}

/** @public */
export function DefaultDebugMenu({ children }: TLUiDebugMenuProps) {
	const msg = useTranslation()
	const content = children ?? <DefaultDebugMenuContent />

	return (
		<DropdownMenuRoot id="debug">
			<DropdownMenuTrigger>
				<Button type="icon" icon="dots-horizontal" title={msg('debug-panel.more')} />
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top" align="end" alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="debug-panel">
					{content}
				</TldrawUiMenuContextProvider>
			</DropdownMenuContent>
		</DropdownMenuRoot>
	)
}
