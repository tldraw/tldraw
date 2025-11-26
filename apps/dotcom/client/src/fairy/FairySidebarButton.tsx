import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent } from 'react'
import { TldrawUiIcon, TldrawUiToolbarToggleGroup, TldrawUiToolbarToggleItem, useValue } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySprite, getHatColor } from './fairy-sprite/FairySprite'
import { SelectedSprite } from './fairy-sprite/sprites/SelectedSprite'
import { FairyContextMenuContent } from './FairyContextMenuContent'
import { fairyMessages } from './fairy-messages'
import { getProjectColor } from './getProjectColor'

export function FairySidebarButton({
	agent,
	onClick,
	onDoubleClick,
	selectMessage,
	deselectMessage,
	hasAnySelectedFairies,
	hasAnyActiveProjects,
}: {
	agent: FairyAgent
	onClick(e: MouseEvent): void
	onDoubleClick(): void
	selectMessage: string
	deselectMessage: string
	hasAnySelectedFairies: boolean
	hasAnyActiveProjects: boolean
}) {
	const joinSelectedFairiesLabel = useMsg(fairyMessages.joinSelectedFairies)

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
	const projectColor = project ? getProjectColor(project.color) : undefined

	const handlePlusClick = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		// Toggle selection like shift-clicking would
		agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: !fairyIsSelected } : f))
	}

	if (!fairyEntity || !fairyOutfit) return null

	const showPlusButton =
		hasAnySelectedFairies && !fairyIsSelected && !project && !hasAnyActiveProjects
		&& !agent.isSleeping()

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
							<FairySprite
								showShadow
								pose={fairyEntity.pose}
								hatColor={getHatColor(fairyOutfit.hat)}
								isAnimated={fairyEntity.pose !== 'idle' || fairyIsSelected}
								flipX={fairyEntity.flipX}
								isOrchestrator={isOrchestrator}
								projectColor={projectColor}
							/>
							{fairyIsSelected && !project && (
								<div className="fairy-selected-sprite-overlay">
									<SelectedSprite inset={3} />
								</div>
							)}
						{showPlusButton && (
							<button
								className="fairy-plus-button"
								onClick={handlePlusClick}
								aria-label={joinSelectedFairiesLabel}
								title={joinSelectedFairiesLabel}
							>
								<TldrawUiIcon icon="plus" label={joinSelectedFairiesLabel} />
							</button>
						)}
						</div>
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} />
		</_ContextMenu.Root>
	)
}
