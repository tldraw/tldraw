import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback } from 'react'
import {
	Box,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useContainer,
	useDefaultHelpers,
	useEditor,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyConfigDialog } from './FairyConfigDialog'

export function FairyDropdownContent({
	agent,
	onDeleteFairyConfig,
	alignOffset,
	sideOffset,
	side = 'top',
}: {
	agent: FairyAgent
	onDeleteFairyConfig(id: string): void
	alignOffset: number
	sideOffset: number
	side?: 'top' | 'bottom' | 'left' | 'right'
}) {
	const editor = useEditor()
	const container = useContainer()
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
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				side={side}
				align="start"
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 100000000 }}
			>
				<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
					<TldrawUiMenuGroup id="fairy-menu">
						<TldrawUiMenuItem
							id="go-to-fairy"
							onSelect={() => goToFairy(agent)}
							label="Go to fairy"
						/>
						<TldrawUiMenuItem id="help-out" onSelect={() => agent.helpOut()} label="Ask for help" />
						<TldrawUiMenuItem
							id="summon-fairy"
							onSelect={() => summonFairy(agent)}
							label="Summon"
						/>
						<TldrawUiMenuItem
							id="configure-fairy"
							onSelect={() => configureFairy(agent)}
							label="Customize"
						/>
						<TldrawUiMenuItem id="new-chat" onSelect={() => resetChat(agent)} label="Reset chat" />
						<TldrawUiMenuItem
							id="delete-fairy"
							onSelect={() => deleteFairy(agent)}
							label="Delete fairy"
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuContextProvider>
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}
