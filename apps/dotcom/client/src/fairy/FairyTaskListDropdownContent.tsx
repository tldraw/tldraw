import { TldrawUiDropdownMenuContent } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyTaskListMenuContent } from './FairyTaskListMenuContent'

export function FairyTaskListDropdownContent({
	agents,
	alignOffset,
	sideOffset,
	side = 'top',
}: {
	agents: FairyAgent[]
	alignOffset: number
	sideOffset: number
	side?: 'top' | 'bottom' | 'left' | 'right'
}) {
	return (
		<TldrawUiDropdownMenuContent
			side={side}
			align="start"
			className="fairy-sidebar-dropdown"
			alignOffset={alignOffset}
			sideOffset={sideOffset}
		>
			<FairyTaskListMenuContent agents={agents} menuType="menu" />
		</TldrawUiDropdownMenuContent>
	)
}
