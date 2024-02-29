import { preventDefault } from '@tldraw/editor'
import { useContext } from 'react'
import { TLUiEventSource } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiDropdownMenuItem } from '../primitives/TldrawUiDropdownMenu'
import { IsInOverflowContext } from './OverflowingToolbar'

export function TldrawUiToolbarButton({
	id,
	label,
	kbd,
	icon,
	onSelect,
	isSelected,
}: {
	id: string
	label?: string
	kbd?: string
	icon: string
	onSelect: (source: TLUiEventSource) => void
	isSelected: boolean
}) {
	const msg = useTranslation()
	const title = label ? `${msg(label)} ${kbd ? kbdStr(kbd) : ''}` : ''

	const isInOverflow = useContext(IsInOverflowContext)
	if (isInOverflow) {
		return (
			<TldrawUiDropdownMenuItem aria-label={label}>
				<TldrawUiButton
					type="icon"
					className="tlui-button-grid__button"
					onClick={() => {
						onSelect('toolbar')
					}}
					data-testid={`tools.more.${id}`}
					title={title}
					role="radio"
					aria-checked={isSelected ? 'true' : 'false'}
					data-value={id}
				>
					<TldrawUiButtonIcon icon={icon} />
				</TldrawUiButton>
			</TldrawUiDropdownMenuItem>
		)
	}

	return (
		<TldrawUiButton
			type="tool"
			data-testid={`tools.${id}`}
			aria-label={label}
			data-value={id}
			onClick={() => onSelect('toolbar')}
			title={title}
			onTouchStart={(e) => {
				preventDefault(e)
				onSelect('toolbar')
			}}
			role="radio"
			aria-checked={isSelected ? 'true' : 'false'}
		>
			<TldrawUiButtonIcon icon={icon} />
		</TldrawUiButton>
	)
}
