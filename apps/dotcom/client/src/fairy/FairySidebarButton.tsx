import { ContextMenu as _ContextMenu } from 'radix-ui'
import { TldrawUiToolbarToggleGroup, TldrawUiToolbarToggleItem, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { FairyContextMenuContent } from './FairyContextMenuContent'

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
	const fairyIsSelected = useValue(
		'fairy-button-selected',
		() => agent.$fairyEntity.get()?.isSelected ?? false,
		[agent]
	)

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
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
					>
						<FairySpriteComponent entity={fairyEntity} outfit={fairyOutfit} animated={true} />
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} onDeleteFairyConfig={onDeleteFairyConfig} />
		</_ContextMenu.Root>
	)
}
