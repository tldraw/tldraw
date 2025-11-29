import { ContextMenu as _ContextMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { FairyMenuContent, FairyMenuSource } from './FairyMenuContent'

export function FairyContextMenuContent({
	agent,
	source,
}: {
	agent: FairyAgent
	source: FairyMenuSource
}) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				onPointerDown={(e) => e.stopPropagation()}
				style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
			>
				<FairyMenuContent agent={agent} menuType="context-menu" source={source} />
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
