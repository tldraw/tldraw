import { ContextMenu as _ContextMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyMenuContent } from './FairyMenuContent'

export function FairyContextMenuContent({ agent }: { agent: FairyAgent }) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 10000000 }}
			>
				<FairyMenuContent agent={agent} menuType="context-menu" />
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
