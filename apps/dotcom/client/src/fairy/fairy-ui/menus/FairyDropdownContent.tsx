import { TldrawUiDropdownMenuContent } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { FairyMenuContent } from './FairyMenuContent'

export function FairyDropdownContent({
	agent,
	alignOffset,
	sideOffset,
	side = 'top',
}: {
	agent: FairyAgent
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
			<FairyMenuContent agent={agent} menuType="menu" />
		</TldrawUiDropdownMenuContent>
	)
}
