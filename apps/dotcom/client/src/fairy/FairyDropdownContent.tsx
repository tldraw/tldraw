import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
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
	const container = useContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				side={side}
				align="start"
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
			>
				<FairyMenuContent agent={agent} menuType="menu" />
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}
