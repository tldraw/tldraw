import { ContextMenu as _ContextMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyTaskListMenuContent } from './FairyTaskListMenuContent'

export function FairyTaskListContextMenuContent({ agents }: { agents: FairyAgent[] }) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 100000000 }}
			>
				<FairyTaskListMenuContent agents={agents} menuType="context-menu" />
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
