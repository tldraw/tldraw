import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import { Button } from '../primitives/Button'
import { Dropdown, DropdownContent, DropdownTrigger } from '../primitives/DropdownMenu'
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
		<Dropdown id="debug">
			<DropdownTrigger>
				<Button type="icon" icon="dots-horizontal" title={msg('debug-panel.more')} />
			</DropdownTrigger>
			<DropdownContent side="top" align="end" alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="debug-panel">
					{content}
				</TldrawUiMenuContextProvider>
			</DropdownContent>
		</Dropdown>
	)
}
