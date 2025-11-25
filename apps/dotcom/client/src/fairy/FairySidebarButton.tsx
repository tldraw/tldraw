import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent } from 'react'
import { TldrawUiToolbarToggleGroup, TldrawUiToolbarToggleItem, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySpriteComponent2 } from './fairy-sprite/FairySprite2'
import { SelectedSprite } from './fairy-sprite/sprites/SelectedSprite'
import { FairyContextMenuContent } from './FairyContextMenuContent'
import { getProjectColor } from './getProjectColor'

export function FairySidebarButton({
	agent,
	onClick,
	onDoubleClick,
	selectMessage,
	deselectMessage,
}: {
	agent: FairyAgent
	onClick(e: MouseEvent): void
	onDoubleClick(): void
	selectMessage: string
	deselectMessage: string
}) {
	const fairyIsSelected = useValue(
		'fairy-button-selected',
		() => agent.$fairyEntity.get()?.isSelected ?? false,
		[agent]
	)

	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])
	const project = useValue('current-project', () => agent.getProject(), [agent])
	const isSleeping = useValue('is-sleeping', () => agent.getMode() === 'sleeping', [agent])

	const isOrchestrator = useValue(
		'is-orchestrator',
		() => agent.getRole() === 'orchestrator' || agent.getRole() === 'duo-orchestrator',
		[agent]
	)
	const projectColor = project ? getProjectColor(agent.editor, project.color) : undefined

	if (!fairyEntity || !fairyOutfit) return null

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
						data-is-sleeping={isSleeping}
						aria-label={fairyIsSelected ? deselectMessage : selectMessage}
						value="on"
					>
						<div className="fairy-sprite-wrapper">
							<FairySpriteComponent2
								showShadow
								entity={fairyEntity}
								outfit={fairyOutfit}
								animated={fairyEntity.pose !== 'idle' || fairyIsSelected}
								flipX={fairyEntity.flipX}
								isOrchestrator={isOrchestrator}
								projectColor={projectColor}
							/>
							{fairyIsSelected && !project && (
								<div className="fairy-selected-sprite-overlay">
									<SelectedSprite inset={3} />
								</div>
							)}
						</div>
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} />
		</_ContextMenu.Root>
	)
}
