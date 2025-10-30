import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyConfigDialog } from './FairyConfigDialog'

export function FairyMenuContent({
	agent,
	onDeleteFairyConfig,
	menuType = 'menu',
}: {
	agent: FairyAgent
	onDeleteFairyConfig(id: string): void
	menuType?: 'menu' | 'context-menu'
}) {
	const { addDialog } = useDefaultHelpers()
	const configureFairy = useCallback(
		(agent: FairyAgent) => {
			addDialog({
				component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
			})
		},
		[addDialog]
	)

	const deleteFairy = useCallback(
		(agent: FairyAgent) => {
			agent.dispose()
			onDeleteFairyConfig(agent.id)
		},
		[onDeleteFairyConfig]
	)

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="fairy-movement-menu">
				<TldrawUiMenuItem id="go-to-fairy" onSelect={() => agent.zoomTo()} label="Go to fairy" />
				<TldrawUiMenuItem id="summon-fairy" onSelect={() => agent.summon()} label="Summon fairy" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-chat-menu">
				<TldrawUiMenuItem id="help-out" onSelect={() => agent.helpOut()} label="Ask for help" />
				<TldrawUiMenuItem id="new-chat" onSelect={() => agent.reset()} label="Reset chat" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-config-menu">
				<TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label="Customize fairy"
				/>
				<TldrawUiMenuItem
					id="delete-fairy"
					onSelect={() => deleteFairy(agent)}
					label="Delete fairy"
				/>
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
