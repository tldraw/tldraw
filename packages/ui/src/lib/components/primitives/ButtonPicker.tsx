import { DefaultColorStyle, SharedStyle, StyleProp, useEditor } from '@tldraw/editor'
import { clamp } from '@tldraw/primitives'
import classNames from 'classnames'
import * as React from 'react'
import { useRef } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { StyleValuesForUi } from '../StylePanel/styles'
import { Button } from './Button'

/** @internal */
export interface ButtonPickerProps<T extends string> {
	title: string
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	columns?: 2 | 3 | 4
	kbdBindings?: string[]
	onValueChange: (style: StyleProp<T>, value: T, squashing: boolean) => void
}

function _ButtonPicker<T extends string>(props: ButtonPickerProps<T>) {
	const {
		uiType,
		items,
		title,
		style,
		value,
		columns = clamp(items.length, 2, 4),
		kbdBindings,
		onValueChange,
	} = props
	const editor = useEditor()
	const msg = useTranslation()

	const rPointing = useRef(false)

	const [isParentFocused, setIsParentFocused] = React.useState(false)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
		handleKeyDown,
	} = React.useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			window.removeEventListener('pointerup', handlePointerUp)
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			editor.mark('point picker item')
			onValueChange(style, id as T, false)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			editor.mark('point picker item')
			onValueChange(style, id as T, true)

			rPointing.current = true
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			onValueChange(style, id as T, true)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			onValueChange(style, id as T, false)
		}

		const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
			const { id } = e.currentTarget.dataset

			const currentItemIndex: number = items.findIndex((i) => i.value === id)
			switch (e.key) {
				case 'ArrowRight': {
					const indexToFind: number =
						currentItemIndex === items.length - 1 ? 0 : currentItemIndex + 1

					handleNextItemChanged(e.currentTarget.parentElement, indexToFind)
					break
				}
				case 'ArrowLeft': {
					const indexToFind: number =
						currentItemIndex === 0 ? items.length - 1 : currentItemIndex - 1

					handleNextItemChanged(e.currentTarget.parentElement, indexToFind)
					break
				}
				case 'ArrowDown': {
					const indexToFind: number =
						currentItemIndex > items.length - 1 - columns // '- columns' denotes the last row
							? currentItemIndex % columns
							: currentItemIndex + columns

					handleNextItemChanged(e.currentTarget.parentElement, indexToFind)
					break
				}
				case 'ArrowUp': {
					const numRows: number = Math.ceil(items.length / columns)
					let indexToFind: number | undefined = currentItemIndex - columns
					indexToFind = indexToFind < 0 ? indexToFind + numRows * columns : indexToFind

					handleNextItemChanged(e.currentTarget.parentElement, indexToFind)
					break
				}
				default: {
					const kbdIndex: number | undefined = kbdBindings?.findIndex(
						(kbd: string) => kbd === e.key
					)

					handleNextItemChanged(e.currentTarget.parentElement, kbdIndex)
				}
			}
		}

		const handleNextItemChanged = (
			parentElement: HTMLElement | null,
			kdbIndex: number | undefined
		) => {
			if (kdbIndex === undefined || kdbIndex < 0) {
				// No valid keyboard index to change, break out.
				return
			}

			const nextItem = items.find((i, index) => index === kdbIndex)
			if (nextItem === undefined) {
				// No keyboard binding maps to an item, break out.
				return
			}
			const nextButton: HTMLButtonElement | null | undefined = parentElement?.querySelector(
				`[data-id="${nextItem?.value}"]`
			)

			nextButton?.focus()
			onValueChange(style, nextItem.value, false)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
			handleKeyDown,
		}
	}, [value, editor, onValueChange, style, columns, kbdBindings, items])

	return (
		<div
			className={classNames('tlui-button-grid', {
				'tlui-button-grid__two': columns === 2,
				'tlui-button-grid__three': columns === 3,
				'tlui-button-grid__four': columns === 4,
			})}
			onFocus={() => setIsParentFocused(true)}
			onBlur={() => setIsParentFocused(false)}
		>
			{items.map((item, index) => (
				<Button
					key={item.value}
					data-id={item.value}
					data-testid={`style.${uiType}.${item.value}`}
					aria-label={item.value}
					data-state={value.type === 'shared' && value.value === item.value ? 'hinted' : undefined}
					title={title + ' — ' + msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)}
					className={classNames('tlui-button-grid__button')}
					style={
						style === (DefaultColorStyle as StyleProp<unknown>)
							? { color: `var(--palette-${item.value})` }
							: undefined
					}
					onPointerEnter={handleButtonPointerEnter}
					onPointerDown={handleButtonPointerDown}
					onPointerUp={handleButtonPointerUp}
					onClick={handleButtonClick}
					onKeyDown={handleKeyDown}
					kbd={
						props?.kbdBindings && isParentFocused && index < props.kbdBindings.length
							? props.kbdBindings[index]
							: undefined
					}
					icon={item.icon as TLUiIconType}
				/>
			))}
		</div>
	)
}

/** @internal */
export const ButtonPicker = React.memo(_ButtonPicker) as typeof _ButtonPicker
