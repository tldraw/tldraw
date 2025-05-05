import { ReactNode } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { TlaAppMenuContent } from './TlaAppMenuContent'

export function TlaAppMenu({ children }: { children: ReactNode }) {
	return (
		<TldrawUiDropdownMenuRoot id={`account-menu-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className="tla-account-menu"
					side="bottom"
					align="end"
					alignOffset={0}
					sideOffset={4}
				>
					<TlaAppMenuContent />
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
