import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useValue,
} from 'tldraw'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { FairySprite } from './FairySprite'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'

const fairyMessages = defineMessages({
	toolbar: { defaultMessage: 'Fairies' },
	deselect: { defaultMessage: 'Deselect Fairy' },
	select: { defaultMessage: 'Select Fairy' },
})

export function FairyHUD({ agents }: { agents: TldrawFairyAgent[] }) {
	// For now, we'll just handle the first agent since FairyAppInner creates only one
	const agent = agents[0]

	const isSelected = useValue(
		'fairy toggle button state',
		() => agent?.$fairy.get()?.isSelected ?? false,
		[agent]
	)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselect)
	const selectMessage = useMsg(fairyMessages.select)

	if (!agent) return null

	const handleToggle = () => {
		agent.$fairy.update((f) => ({ ...f!, isSelected: !f!.isSelected }))
	}

	return (
		<div
			className="tla-fairy-hud"
			style={{
				position: 'fixed',
				bottom: '48px',
				right: '6px',
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				alignItems: 'center',
				gap: '8px',
				cursor: 'pointer',
				pointerEvents: 'auto',
			}}
		>
			{isSelected && (
				<div className="fairy-row__input">
					<FairyBasicInput agent={agent} />
				</div>
			)}
			<TldrawUiToolbar label={toolbarMessage}
						style={{
							borderRadius: 'var(--tl-radius-2)',
							boxShadow: 'var(--tl-shadow-1)',
						}}>
				<TldrawUiToolbarToggleGroup
					// TODO: do multiple later
					type="single"
					value={isSelected ? 'on' : 'off'}
					asChild
				>
					<TldrawUiToolbarToggleItem
						onClick={handleToggle}
						type="icon"
						data-state={isSelected ? 'on' : 'off'}
						data-isactive={isSelected}
						aria-label={isSelected ? deselectMessage : selectMessage}
						value="on"
					>
						<FairySprite
							pose="idle"
							outfit={{
								body: 'default',
								eyes: 'default',
								hat: 'default',
								mouth: 'default',
								wand: 'default',
								wings: 'default',
								arms: 'default',
								legs: 'default',
								head: 'default',
							}}
						/>
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</TldrawUiToolbar>
		</div>
	)
}
