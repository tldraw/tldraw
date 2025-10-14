import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useValue,
} from 'tldraw'
import { defineMessages, useMsg } from '../tla/utils/i18n'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

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
			<TldrawUiToolbar
				label={toolbarMessage}
				style={{
					borderRadius: 'var(--tl-radius-2)',
					boxShadow: 'var(--tl-shadow-1)',
				}}
			>
				<TldrawUiToolbarToggleGroup
					// TODO: do multiple later
					type="single"
					value={isSelected ? 'on' : 'off'}
					asChild
				>
					<TldrawUiToolbarToggleItem
						className="fairy-toggle-button"
						onClick={handleToggle}
						type="icon"
						data-state={isSelected ? 'on' : 'off'}
						data-isactive={isSelected}
						aria-label={isSelected ? deselectMessage : selectMessage}
						value="on"
					>
						{/* <div style={{ width: '20px', height: '20px' }}> */}
						<FairySpriteComponent
							pose="idle"
							outfit={{
								body: 'plain',
								hat: 'pointy',
								wings: 'plain',
							}}
						/>
						{/* </div> */}
					</TldrawUiToolbarToggleItem>
				</TldrawUiToolbarToggleGroup>
			</TldrawUiToolbar>
		</div>
	)
}
