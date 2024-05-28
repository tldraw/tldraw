import { ReactNode } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultDebugMenuContent } from './DefaultDebugMenuContent'

/** @public */
export interface TLUiDebugMenuProps {
	children?: ReactNode
}

/** @public */
export function DefaultDebugMenu({ children }: TLUiDebugMenuProps) {
	const content = children ?? <DefaultDebugMenuContent />

	return (
		<TldrawUiDropdownMenuRoot id="debug">
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton type="icon" title="Debug menu">
					<TldrawUiButtonIcon icon="dots-horizontal" />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="top" align="end" alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="debug-panel">
					{content}
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
