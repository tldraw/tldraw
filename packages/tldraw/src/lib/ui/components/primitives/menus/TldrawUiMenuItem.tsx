import { ContextMenuItem } from '@radix-ui/react-context-menu'
import { GeoShapeGeoStyle, preventDefault, useEditor, useValue } from '@tldraw/editor'
import { useState } from 'react'
import { unwrapLabel } from '../../../context/actions'
import { TLUiEventSource } from '../../../context/events'
import { useReadonly } from '../../../hooks/useReadonly'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../../kbd-utils'
import { Spinner } from '../../Spinner'
import { TldrawUiButton } from '../Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../Button/TldrawUiButtonLabel'
import { TldrawUiDropdownMenuItem } from '../TldrawUiDropdownMenu'
import { TldrawUiKbd } from '../TldrawUiKbd'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export type TLUiMenuItemProps<
	TranslationKey extends string = string,
	IconType extends string = string,
> = {
	id: string
	/**
	 * The icon to display on the item.
	 */
	icon?: IconType
	/**
	 * The keyboard shortcut to display on the item.
	 */
	kbd?: string
	/**
	 * The title to display on the item.
	 */
	title?: string
	/**
	 * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
	 */
	label?: TranslationKey | { [key: string]: TranslationKey }
	/**
	 * If the editor is in readonly mode and the item is not marked as readonlyok, it will not be rendered.
	 */
	readonlyOk?: boolean
	/**
	 * The function to call when the item is clicked.
	 */
	onSelect: (source: TLUiEventSource) => Promise<void> | void
	/**
	 * Whether this item should be disabled.
	 */
	disabled?: boolean
	/**
	 * Prevent the menu from closing when the item is clicked
	 */
	noClose?: boolean
	/**
	 * Whether to show a spinner on the item.
	 */
	spinner?: boolean
	/**
	 * A meta property associated with this menu item.
	 */
	meta?: { [key: string]: any }
}

/** @public */
export function TldrawUiMenuItem<
	TranslationKey extends string = string,
	IconType extends string = string,
>({
	disabled = false,
	spinner = false,
	readonlyOk = false,
	id,
	kbd,
	label,
	icon,
	onSelect,
	noClose,
	meta,
}: TLUiMenuItemProps<TranslationKey, IconType>) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()

	const msg = useTranslation()

	const [disableClicks, setDisableClicks] = useState(false)

	const isReadonlyMode = useReadonly()
	if (isReadonlyMode && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const kbdTouse = kbd ? kbdStr(kbd) : undefined

	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined
	const titleStr = labelStr && kbdTouse ? `${labelStr} ${kbdTouse}` : labelStr

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuItem>
					<TldrawUiButton
						type="menu"
						data-testid={`${sourceId}.${id}`}
						disabled={disabled}
						title={titleStr}
						onClick={(e) => {
							if (noClose) {
								preventDefault(e)
							}
							if (disableClicks) {
								setDisableClicks(false)
							} else {
								onSelect(sourceId)
							}
						}}
					>
						<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
						{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
					</TldrawUiButton>
				</TldrawUiDropdownMenuItem>
			)
		}
		case 'context-menu': {
			// Hide disabled context menu items
			if (disabled) return null

			return (
				<ContextMenuItem
					dir="ltr"
					title={titleStr}
					draggable={false}
					className="tlui-button tlui-button__menu"
					data-testid={`${sourceId}.${id}`}
					onSelect={(e) => {
						if (noClose) preventDefault(e)
						if (disableClicks) {
							setDisableClicks(false)
						} else {
							onSelect(sourceId)
						}
					}}
				>
					<span className="tlui-button__label" draggable={false}>
						{labelStr}
					</span>
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
					{spinner && <Spinner />}
				</ContextMenuItem>
			)
		}
		case 'panel': {
			return (
				<TldrawUiButton
					data-testid={`${sourceId}.${id}`}
					type="menu"
					title={titleStr}
					disabled={disabled}
					onClick={() => onSelect(sourceId)}
				>
					<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
					{icon && <TldrawUiButtonIcon icon={icon} />}
				</TldrawUiButton>
			)
		}
		case 'small-icons':
		case 'icons': {
			return (
				<TldrawUiButton
					data-testid={`${sourceId}.${id}`}
					type="icon"
					title={titleStr}
					disabled={disabled}
					onClick={() => onSelect(sourceId)}
				>
					<TldrawUiButtonIcon icon={icon!} small={menuType === 'small-icons'} />
				</TldrawUiButton>
			)
		}
		case 'keyboard-shortcuts': {
			if (!kbd) {
				console.warn(
					`Menu item '${label}' isn't shown in the keyboard shortcuts dialog because it doesn't have a keyboard shortcut.`
				)
				return null
			}

			return (
				<div className="tlui-shortcuts-dialog__key-pair" data-testid={`${sourceId}.${id}`}>
					<div className="tlui-shortcuts-dialog__key-pair__key">{labelStr}</div>
					<div className="tlui-shortcuts-dialog__key-pair__value">
						<TldrawUiKbd visibleOnMobileLayout>{kbd}</TldrawUiKbd>
					</div>
				</div>
			)
		}
		case 'helper-buttons': {
			return (
				<TldrawUiButton type="low" onClick={() => onSelect(sourceId)}>
					<TldrawUiButtonIcon icon={icon!} />
					<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
				</TldrawUiButton>
			)
		}
		case 'tools': {
			return (
				<TldrawUiMenuButton
					id={id}
					sourceId={sourceId}
					titleStr={titleStr}
					disabled={disabled}
					meta={meta}
					icon={icon}
					onSelect={onSelect}
				/>
			)
		}
		default: {
			return null
		}
	}
}

function TldrawUiMenuButton<
	TranslationKey extends string = string,
	IconType extends string = string,
>({
	sourceId,
	id,
	titleStr,
	disabled,
	onSelect,
	icon,
	meta,
}: {
	titleStr?: string
	sourceId: TLUiEventSource
} & Pick<
	TLUiMenuItemProps<TranslationKey, IconType>,
	'id' | 'meta' | 'icon' | 'disabled' | 'onSelect'
>) {
	const editor = useEditor()
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

	return (
		<TldrawUiButton
			data-state={isSelected ? 'selected' : ''}
			data-testid={`${sourceId}.${id}`}
			type="tool"
			title={titleStr}
			disabled={disabled}
			role="radio"
			aria-checked={isSelected ? 'true' : 'false'}
			onClick={() => onSelect(sourceId)}
		>
			<TldrawUiButtonIcon icon={icon!} />
		</TldrawUiButton>
	)
}
