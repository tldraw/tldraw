import {
	exhaustiveSwitchError,
	getPointerInfo,
	preventDefault,
	TLPointerEventInfo,
	useEditor,
	Vec,
	VecModel,
} from '@tldraw/editor'
import { ContextMenu as _ContextMenu } from 'radix-ui'
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
import { TLUiIconJsx } from '../TldrawUiIcon'
import { TldrawUiKbd } from '../TldrawUiKbd'
import { TldrawUiToolbarButton } from '../TldrawUiToolbar'
import { tooltipManager } from '../TldrawUiTooltip'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export interface TLUiMenuItemProps<
	TranslationKey extends string = string,
	IconType extends string = string,
> {
	id: string
	/**
	 * The icon to display on the item. Icons are only shown in certain menu types.
	 */
	icon?: IconType | TLUiIconJsx
	/**
	 * An icon to display to the left of the menu item.
	 */
	iconLeft?: IconType | TLUiIconJsx
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
	 * The function to call when the item is dragged. If this is provided, the item will be draggable.
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
	iconLeft,
	onSelect,
	noClose,
	isSelected,
	onDragStart,
}: TLUiMenuItemProps<TranslationKey, IconType>) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()

	const msg = useTranslation()

	const [disableClicks, setDisableClicks] = useState(false)

	const isReadonlyMode = useReadonly()
	if (isReadonlyMode && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const kbdToUse = kbd ? kbdStr(kbd) : undefined

	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined
	const titleStr = labelStr && kbdToUse ? `${labelStr} ${kbdToUse}` : labelStr

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuItem>
					<TldrawUiButton
						type="menu"
						data-testid={`${sourceId}.${id}`}
						disabled={disabled}
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
						{iconLeft && <TldrawUiButtonIcon icon={iconLeft} small />}
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
				<_ContextMenu.Item
					dir="ltr"
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
					{iconLeft && <TldrawUiButtonIcon icon={iconLeft} small />}
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
					{spinner && <Spinner />}
				</_ContextMenu.Item>
			)
		}
		case 'small-icons':
		case 'icons': {
			return (
				<TldrawUiToolbarButton
					data-testid={`${sourceId}.${id}`}
					type="icon"
					title={titleStr}
					disabled={disabled}
					onClick={() => onSelect(sourceId)}
				>
					<TldrawUiButtonIcon icon={icon!} small />
				</TldrawUiToolbarButton>
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
			if (onDragStart) {
				return (
					<DraggableToolbarButton
						id={id}
						icon={icon}
						onSelect={onSelect}
						onDragStart={onDragStart}
						labelStr={labelStr}
						titleStr={titleStr}
						disabled={disabled}
						isSelected={isSelected}
					/>
				)
			}
			return (
				<TldrawUiToolbarButton
					aria-label={labelStr}
					aria-pressed={isSelected ? 'true' : 'false'}
					data-testid={`tools.${id}`}
					data-value={id}
					disabled={disabled}
					onClick={() => onSelect('toolbar')}
					onTouchStart={(e) => {
						preventDefault(e)
						onSelect('toolbar')
					}}
					title={titleStr}
					type="tool"
				>
					<TldrawUiButtonIcon icon={icon!} />
				</TldrawUiToolbarButton>
			)
		}
		case 'toolbar-overflow': {
			if (onDragStart) {
				return (
					<DraggableToolbarButton
						id={id}
						icon={icon}
						onSelect={onSelect}
						onDragStart={onDragStart}
						labelStr={labelStr}
						titleStr={titleStr}
						disabled={disabled}
						isSelected={isSelected}
						overflow
					/>
				)
			}
			return (
				<TldrawUiToolbarButton
					aria-label={labelStr}
					aria-pressed={isSelected ? 'true' : 'false'}
					isActive={isSelected}
					data-testid={`tools.more.${id}`}
					data-value={id}
					disabled={disabled}
					onClick={() => onSelect('toolbar')}
					title={titleStr}
					type="icon"
				>
					<TldrawUiButtonIcon icon={icon!} />
				</TldrawUiToolbarButton>
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
					screenSpaceStart: VecModel
			  }
			| {
					name: 'dragging'
					screenSpaceStart: VecModel
			  }
			| {
					name: 'dragged'
			  }

		function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
			state = {
				name: 'pointing',
				screenSpaceStart: { x: e.clientX, y: e.clientY },
			}

			e.currentTarget.setPointerCapture(e.pointerId)
		}

		function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
			if ((e as any).isSpecialRedispatchedEvent) return

			if (state.name === 'pointing') {
				const distanceSq = Vec.Dist2(state.screenSpaceStart, { x: e.clientX, y: e.clientY })
				if (
					distanceSq >
					(editor.getInstanceState().isCoarsePointer
						? editor.options.uiCoarseDragDistanceSquared
						: editor.options.uiDragDistanceSquared)
				) {
					const screenSpaceStart = state.screenSpaceStart
					state = {
						name: 'dragging',
						screenSpaceStart,
					}

					editor.run(() => {
						editor.setCurrentTool('select')

						// Set origin point
						editor.dispatch({
							type: 'pointer',
							target: 'canvas',
							name: 'pointer_down',
							...getPointerInfo(editor, e),
							point: screenSpaceStart,
						})

						// Pointer down potentially selects shapes, so we need to deselect them.
						editor.selectNone()

						// start drag
						onDragStart?.('toolbar', {
							type: 'pointer',
							target: 'canvas',
							name: 'pointer_move',
							...getPointerInfo(editor, e),
							point: screenSpaceStart,
						})

						tooltipManager.hideAllTooltips()
						editor.getContainer().focus()
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
				...getPointerInfo(editor, e),
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
	labelStr,
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
	labelStr?: string
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
			<TldrawUiToolbarButton
				aria-label={labelStr}
				aria-pressed={isSelected ? 'true' : 'false'}
				isActive={isSelected}
				className="tlui-button-grid__button"
				data-testid={`tools.more.${id}`}
				data-value={id}
				disabled={disabled}
				title={titleStr}
				type="icon"
				{...events}
			>
				<TldrawUiButtonIcon icon={icon!} />
			</TldrawUiToolbarButton>
		)
	}

	return (
		<TldrawUiToolbarButton
			aria-label={labelStr}
			aria-pressed={isSelected ? 'true' : 'false'}
			data-testid={`tools.${id}`}
			data-value={id}
			disabled={disabled}
			onTouchStart={(e) => {
				preventDefault(e)
				onSelect('toolbar')
			}}
			title={titleStr}
			type="tool"
			{...events}
		>
			<TldrawUiButtonIcon icon={icon!} />
		</TldrawUiToolbarButton>
	)
}
