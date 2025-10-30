import { useCallback } from 'react'
import {
	Box,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
	useEditor,
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
	const editor = useEditor()
	const { addDialog } = useDefaultHelpers()

	const goToFairy = useCallback(
		(fairy: FairyAgent) => {
			editor.zoomToBounds(Box.FromCenter(fairy.$fairyEntity.get().position, { x: 100, y: 100 }), {
				animation: { duration: 220 },
				targetZoom: 1,
			})
		},
		[editor]
	)

	const configureFairy = useCallback(
		(agent: FairyAgent) => {
			addDialog({
				component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
			})
		},
		[addDialog]
	)

	const summonFairy = useCallback(
		(agent: FairyAgent) => {
			const position = editor.getViewportPageBounds().center
			agent.$fairyEntity.update((f) => (f ? { ...f, position, gesture: 'poof' } : f))
		},
		[editor]
	)

	const resetChat = useCallback((agent: FairyAgent) => {
		agent.cancel()
		agent.reset()
	}, [])

	const deleteFairy = useCallback(
		(agent: FairyAgent) => {
			agent.dispose()
			// Delete the fairy config (which will trigger disposal in FairyApp)
			onDeleteFairyConfig(agent.id)
		},
		[onDeleteFairyConfig]
	)

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="fairy-movement-menu">
				<TldrawUiMenuItem id="go-to-fairy" onSelect={() => goToFairy(agent)} label="Go to fairy" />
				<TldrawUiMenuItem
					id="summon-fairy"
					onSelect={() => summonFairy(agent)}
					label="Summon fairy"
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-chat-menu">
				<TldrawUiMenuItem id="help-out" onSelect={() => agent.helpOut()} label="Ask for help" />
				<TldrawUiMenuItem id="new-chat" onSelect={() => resetChat(agent)} label="Reset chat" />
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
