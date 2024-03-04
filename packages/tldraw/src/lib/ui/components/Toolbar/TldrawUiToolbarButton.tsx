import { GeoShapeGeoStyle, preventDefault, useEditor, useValue } from '@tldraw/editor'
import { useContext } from 'react'
import { useReadonly } from '../../hooks/useReadonly'
import { TLUiToolItem } from '../../hooks/useTools'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiDropdownMenuItem } from '../primitives/TldrawUiDropdownMenu'
import { IsInOverflowContext } from './OverflowingToolbar'

/** @public */
export function TldrawUiToolbarButton({
	id,
	label,
	kbd,
	icon,
	onSelect,
	meta,
	readonlyOk,
}: TLUiToolItem) {
	const editor = useEditor()
	const msg = useTranslation()
	const isReadonlyMode = useReadonly()
	const title = label ? `${msg(label)} ${kbd ? kbdStr(kbd) : ''}` : ''

	const geo = meta?.geo
	const isSelected = useValue(
		'is tool selected',
		() => {
			const activeToolId = editor.getCurrentToolId()
			const geoState = editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			return geo ? activeToolId === 'geo' && geoState === geo : activeToolId === id
		},
		[editor, meta, id, geo]
	)

	const isInOverflow = useContext(IsInOverflowContext)

	if (isReadonlyMode && !readonlyOk) return null

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
