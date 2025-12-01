import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent, useCallback } from 'react'
import {
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	TldrawUiTooltip,
	useValue,
} from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getProjectColor } from '../../fairy-helpers/getProjectColor'
import { fairyMessages } from '../../fairy-messages'
import { FairySprite, getHatColor } from '../../fairy-sprite/FairySprite'
import { FairyReticleSprite } from '../../fairy-sprite/sprites/FairyReticleSprite'
import { FairyContextMenuContent } from '../menus/FairyContextMenuContent'

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
	const fairyIsSelected = useValue(
		'fairy-button-selected',
		() => agent.getEntity()?.isSelected ?? false,
		[agent]
	)

	const fairyOutfit = useValue('fairy outfit', () => agent.getConfig()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.getEntity(), [agent])
	const project = useValue('current-project', () => agent.getProject(), [agent])
	const isSleeping = useValue('is-sleeping', () => agent.mode.getMode() === 'sleeping', [agent])

	const isOrchestrator = useValue(
		'is-orchestrator',
		() => agent.getRole() === 'orchestrator' || agent.getRole() === 'duo-orchestrator',
		[agent]
	)
	const projectColor = project ? getProjectColor(project.color) : undefined

	const handlePlusClick = useCallback(() => {
		// Toggle selection like shift-clicking would
		agent.updateEntity((f) => (f ? { ...f, isSelected: !f.isSelected } : f))
	}, [agent])

	if (!fairyEntity || !fairyOutfit) return null

	const showPlusButton =
		hasAnySelectedFairies &&
		!fairyIsSelected &&
		!project &&
		!hasAnyActiveProjects &&
		!agent.mode.isSleeping()

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
								gesture={fairyEntity.gesture}
								hatColor={getHatColor(fairyOutfit.hat)}
								isAnimated={fairyEntity.pose !== 'idle' || fairyIsSelected}
								flipX={fairyEntity.pose === 'sleeping' ? false : fairyEntity.flipX}
								isOrchestrator={isOrchestrator}
								projectColor={projectColor}
							/>
							{fairyIsSelected && !project && (
								<div className="fairy-selected-sprite-overlay">
									<FairyReticleSprite inset={3} />
								</div>
							)}
							{showPlusButton && <PlusButton onClick={handlePlusClick} />}
						</div>
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} source="sidebar" />
		</_ContextMenu.Root>
	)
}

function PlusButton({ onClick }: { onClick(): void }) {
	const joinSelectedFairiesLabel = useMsg(fairyMessages.joinSelectedFairies)

	return (
		<TldrawUiTooltip content={joinSelectedFairiesLabel} side="top">
			<div
				role="button"
				tabIndex={0}
				className="fairy-plus-button"
				onClick={(e) => {
					e.stopPropagation()
					e.preventDefault()
					onClick()
				}}
				aria-label={joinSelectedFairiesLabel}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						onClick()
					}
				}}
			>
				<svg
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<circle
						className="fairy-plus-button-circle"
						cx="6"
						cy="6"
						r="6"
						fill="var(--tl-color-fairy-select-bg)"
					/>
					<line
						x1="4"
						y1="6"
						x2="8"
						y2="6"
						stroke="var(--tl-color-fairy-light)"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<line
						x1="6"
						y1="4"
						x2="6"
						y2="8"
						stroke="var(--tl-color-fairy-light)"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</div>
		</TldrawUiTooltip>
	)
}
