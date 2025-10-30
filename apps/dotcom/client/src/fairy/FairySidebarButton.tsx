import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEventHandler, useCallback, useState } from 'react'
import { TldrawUiToolbarToggleGroup, TldrawUiToolbarToggleItem, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { FairyDropdownContent } from './FairyDropdownContent'

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
	const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false)

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])

	const handleContextMenu: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
		e.preventDefault()
		e.stopPropagation()
		setDropdownMenuOpen(true)
	}, [])

	return (
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
				<FairySpriteComponent entity={fairyEntity} outfit={fairyOutfit} animated={true} />
				<_DropdownMenu.Root dir="ltr" open={dropdownMenuOpen} onOpenChange={setDropdownMenuOpen}>
					<_DropdownMenu.Trigger asChild>
						<div></div>
					</_DropdownMenu.Trigger>
					<FairyDropdownContent
						agent={agent}
						onDeleteFairyConfig={onDeleteFairyConfig}
						alignOffset={20}
						sideOffset={20}
						side="top"
					/>
				</_DropdownMenu.Root>
			</TldrawUiToolbarToggleItem>
		</TldrawUiToolbarToggleGroup>
	)
}
