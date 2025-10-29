import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEventHandler, useCallback, useState } from 'react'
import {
	Box,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { FairyConfigDialog } from './FairyConfigDialog'

export function FairySidebarButton({
	agent,
	onClick,
	onDoubleClick,
	selectMessage,
	deselectMessage,
	onDeleteFairyConfig,
}: {
	agent: FairyAgent
	onClick(): void
	onDoubleClick(): void
	selectMessage: string
	deselectMessage: string
	onDeleteFairyConfig(id: string): void
}) {
	const editor = useEditor()
	const { addDialog } = useDefaultHelpers()
	// Use useValue to make the component reactive
	const fairyIsSelected = useValue(
		'fairy-button-selected',
		() => agent.$fairyEntity.get()?.isSelected ?? false,
		[agent]
	)
	const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false)

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])

	const handleContextMenu: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
		e.preventDefault()
		e.stopPropagation()
		setDropdownMenuOpen(true)
	}, [])

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
		<>
			<TldrawUiToolbarToggleGroup type="single" value={fairyIsSelected ? 'on' : 'off'} asChild>
				<TldrawUiToolbarToggleItem
					className="fairy-toggle-button"
					onClick={onClick}
					onDoubleClick={onDoubleClick}
					type="icon"
					data-state={fairyIsSelected ? 'on' : 'off'}
					data-isactive={fairyIsSelected}
					aria-label={fairyIsSelected ? deselectMessage : selectMessage}
					value="on"
					onContextMenu={handleContextMenu}
				>
					<_DropdownMenu.Root
						dir="ltr"
						open={dropdownMenuOpen}
						onOpenChange={setDropdownMenuOpen}
						defaultOpen={true}
					>
						<_DropdownMenu.Trigger asChild>
							<div style={{ position: 'fixed', zIndex: 99999999999 }}></div>
						</_DropdownMenu.Trigger>
						<_DropdownMenu.Content
							side="top"
							align="start"
							className="tlui-menu"
							collisionPadding={4}
							alignOffset={20}
							sideOffset={20}
							onClick={(e) => e.stopPropagation()}
						>
							<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
								<TldrawUiMenuGroup id="fairy-menu">
									<TldrawUiMenuItem
										id="go-to-fairy"
										onSelect={() => goToFairy(agent)}
										label="Go to fairy"
									/>
									<TldrawUiMenuItem
										id="help-out"
										onSelect={() => agent.helpOut()}
										label="Ask for help"
									/>
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
									<TldrawUiMenuItem
										id="new-chat"
										onSelect={() => resetChat(agent)}
										label="Reset chat"
									/>
									<TldrawUiMenuItem
										id="delete-fairy"
										onSelect={() => deleteFairy(agent)}
										label="Delete fairy"
									/>
								</TldrawUiMenuGroup>
							</TldrawUiMenuContextProvider>
						</_DropdownMenu.Content>
					</_DropdownMenu.Root>
					<FairySpriteComponent entity={fairyEntity} outfit={fairyOutfit} animated={true} />
				</TldrawUiToolbarToggleItem>
			</TldrawUiToolbarToggleGroup>
		</>
	)
}
