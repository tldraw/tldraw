import { ContextMenuItem } from '@radix-ui/react-context-menu'
import {
	exhaustiveSwitchError,
	getPointerInfo,
	preventDefault,
	TLPointerEventInfo,
	useEditor,
	Vec,
} from '@tldraw/editor'
import { useMemo, useState } from 'react'
import { unwrapLabel } from '../../../context/actions'
import { TLUiEventSource } from '../../../context/events'
import { useReadonly } from '../../../hooks/useReadonly'
import { TLUiToolItem } from '../../../hooks/useTools'
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
export interface TLUiMenuItemProps<
	TranslationKey extends string = string,
	IconType extends string = string,
> {
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
	onSelect(source: TLUiEventSource): Promise<void> | void
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
	 * Whether the item is selected.
	 */
	isSelected?: boolean
	/**
	 * Whether the item is draggable.
	 */
	draggable?: boolean
	/**
	 * The function to call when the item is dragged. Requires draggable to be true.
	 */
	onDragStart?(source: TLUiEventSource, info: TLPointerEventInfo): void
}

/** @public @react */
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
	isSelected,
	draggable,
	onDragStart,
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
					{spinner ? <Spinner /> : icon && <TldrawUiButtonIcon icon={icon} />}
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
		case 'toolbar': {
			if (draggable && onDragStart) {
				return (
					<DraggableToolbarButton
						id={id}
						icon={icon}
						onSelect={onSelect}
						onDragStart={onDragStart}
						labelToUse={labelToUse}
						titleStr={titleStr}
						disabled={disabled}
						isSelected={isSelected}
					/>
				)
			}
			return (
				<TldrawUiButton
					type="tool"
					data-testid={`tools.${id}`}
					aria-label={labelToUse}
					data-value={id}
					onClick={() => onSelect('toolbar')}
					title={titleStr}
					disabled={disabled}
					onTouchStart={(e) => {
						preventDefault(e)
						onSelect('toolbar')
					}}
					role="radio"
					aria-checked={isSelected ? 'true' : 'false'}
				>
					<TldrawUiButtonIcon icon={icon!} />
				</TldrawUiButton>
			)
		}
		case 'toolbar-overflow': {
			if (draggable && onDragStart) {
				return (
					<DraggableToolbarButton
						id={id}
						icon={icon}
						onSelect={onSelect}
						onDragStart={onDragStart}
						labelToUse={labelToUse}
						titleStr={titleStr}
						disabled={disabled}
						isSelected={isSelected}
						overflow
					/>
				)
			}
			return (
				<TldrawUiDropdownMenuItem aria-label={label}>
					<TldrawUiButton
						type="icon"
						className="tlui-button-grid__button"
						onClick={() => {
							onSelect('toolbar')
						}}
						data-testid={`tools.more.${id}`}
						data-value={id}
						title={titleStr}
						disabled={disabled}
						role="radio"
						aria-checked={isSelected ? 'true' : 'false'}
					>
						<TldrawUiButtonIcon icon={icon!} />
					</TldrawUiButton>
				</TldrawUiDropdownMenuItem>
			)
		}
		default: {
			throw exhaustiveSwitchError(menuType)
		}
	}
}

function useDraggableEvents(
	onDragStart: TLUiToolItem['onDragStart'],
	onSelect: TLUiToolItem['onSelect']
) {
	const editor = useEditor()
	const events = useMemo(() => {
		let state = { name: 'idle' } as
			| {
					name: 'idle'
			  }
			| {
					name: 'pointing'
					start: Vec
			  }
			| {
					name: 'dragging'
					start: Vec
			  }
			| {
					name: 'dragged'
			  }

		function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
			state = {
				name: 'pointing',
				start: editor.inputs.currentPagePoint.clone(),
			}

			e.currentTarget.setPointerCapture(e.pointerId)
		}

		function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
			if ((e as any).isSpecialRedispatchedEvent) return

			if (state.name === 'pointing') {
				const distance = Vec.Dist2(state.start, editor.inputs.currentPagePoint)
				if (
					distance >
					(editor.getInstanceState().isCoarsePointer
						? editor.options.coarseDragDistanceSquared
						: editor.options.dragDistanceSquared)
				) {
					state = {
						name: 'dragging',
						start: state.start,
					}

					// Set origin point
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'pointer_down',
						...getPointerInfo(e),
						point: state.start,
					})

					// start drag
					onDragStart?.('toolbar', {
						type: 'pointer',
						target: 'canvas',
						name: 'pointer_move',
						...getPointerInfo(e),
					})
				}
			}
		}

		function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
			if ((e as any).isSpecialRedispatchedEvent) return

			e.currentTarget.releasePointerCapture(e.pointerId)

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_up',
				...getPointerInfo(e),
			})
		}

		function handleClick() {
			if (state.name === 'dragging' || state.name === 'dragged') {
				state = { name: 'idle' }
				return true
			}

			state = { name: 'idle' }
			onSelect?.('toolbar')
		}

		return {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			onClick: handleClick,
		}
	}, [onDragStart, editor, onSelect])

	return events
}

function DraggableToolbarButton({
	id,
	labelToUse,
	titleStr,
	disabled,
	isSelected,
	icon,
	onSelect,
	onDragStart,
	overflow,
}: {
	id: string
	disabled: boolean
	labelToUse?: string
	titleStr?: string
	isSelected?: boolean
	icon: TLUiMenuItemProps['icon']
	onSelect: TLUiMenuItemProps['onSelect']
	onDragStart: TLUiMenuItemProps['onDragStart']
	overflow?: boolean
}) {
	const events = useDraggableEvents(onDragStart, onSelect)

	if (overflow) {
		return (
			<TldrawUiDropdownMenuItem aria-label={labelToUse}>
				<TldrawUiButton
					type="icon"
					className="tlui-button-grid__button"
					data-testid={`tools.more.${id}`}
					data-value={id}
					title={titleStr}
					disabled={disabled}
					role="radio"
					aria-checked={isSelected ? 'true' : 'false'}
					{...events}
				>
					<TldrawUiButtonIcon icon={icon!} />
				</TldrawUiButton>
			</TldrawUiDropdownMenuItem>
		)
	}

	return (
		<TldrawUiButton
			type="tool"
			className="tlui-button-grid__button"
			data-testid={`tools.${id}`}
			aria-label={labelToUse}
			data-value={id}
			title={titleStr}
			disabled={disabled}
			onTouchStart={(e) => {
				preventDefault(e)
				onSelect('toolbar')
			}}
			role="radio"
			aria-checked={isSelected ? 'true' : 'false'}
			{...events}
		>
			<TldrawUiButtonIcon icon={icon!} />
		</TldrawUiButton>
	)
}
