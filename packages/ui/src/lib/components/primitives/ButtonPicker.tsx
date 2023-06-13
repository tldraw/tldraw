import { TLStyleItem, TLStyleType, useEditor } from '@tldraw/editor'
import { clamp } from '@tldraw/primitives'
import classNames from 'classnames'
import * as React from 'react'
import { useRef } from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button } from './Button'

/** @internal */
export interface ButtonPickerProps<T extends TLStyleItem> {
	title: string
	items: T[]
	styleType: TLStyleType
	value?: string | number | null
	columns?: 2 | 3 | 4
	'data-testid'?: string
	dynamicKbdBinding?: boolean
	onValueChange: (item: T, squashing: boolean) => void
}

function _ButtonPicker<T extends TLStyleItem>(props: ButtonPickerProps<T>) {
	const {
		items,
		title,
		styleType,
		value = null,
		onValueChange,
		columns = clamp(items.length, 2, 4),
	} = props
	const editor = useEditor()
	const msg = useTranslation()
	const dynamicKbdOptions: string[] = React.useMemo(
		() => [
			'q',
			'w',
			'e',
			'r',
			'a',
			's',
			'd',
			'f',
			'z',
			'x',
			'c',
			'v',
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'0',
			'u',
			'i',
			'o',
			'p',
			'h',
			'j',
			'k',
			'l',
			'v',
			'b',
			'n',
			'm',
		],
		[]
	)
	const rPointing = useRef(false)

	const [isFocused, setIsFocused] = React.useState(false)

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
			if (value === id) return

			editor.mark('point picker item')
			onValueChange(items.find((i) => i.id === id)!, false)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			editor.mark('point picker item')
			onValueChange(items.find((i) => i.id === id)!, true)

			rPointing.current = true
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			onValueChange(items.find((i) => i.id === id)!, true)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			onValueChange(items.find((i) => i.id === id)!, false)
		}

		const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
			const { id } = e.currentTarget.dataset

			const currentItemIndex: number = items.findIndex((i) => i.id === id)
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
					const kbdIndex: number | undefined = dynamicKbdOptions.findIndex(
						(kbd: string) => kbd === e.key
					)

					handleNextItemChanged(e.currentTarget.parentElement, kbdIndex)
				}
			}
		}

		const handleNextItemChanged = (
			parentElement: HTMLElement | null,
			itemIndexToChange: number | undefined
		) => {
			const nextItem: T | undefined = items.find((i, index) => index === itemIndexToChange)
			const nextButton: HTMLButtonElement | null | undefined = parentElement?.querySelector(
				`[data-id="${nextItem?.id}"]`
			)

			nextButton?.focus()
			onValueChange(nextItem!, false)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
			handleKeyDown,
		}
	}, [editor, value, onValueChange, items, dynamicKbdOptions, columns])

	return (
		<div
			className={classNames('tlui-button-grid', {
				'tlui-button-grid__two': columns === 2,
				'tlui-button-grid__three': columns === 3,
				'tlui-button-grid__four': columns === 4,
			})}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
		>
			{items.map((item, index) => (
				<Button
					key={item.id}
					data-id={item.id}
					data-testid={`${props['data-testid']}.${item.id}`}
					aria-label={item.id}
					data-state={value === item.id ? 'hinted' : undefined}
					title={title + ' — ' + msg(`${styleType}-style.${item.id}` as TLUiTranslationKey)}
					className={classNames('tlui-button-grid__button')}
					style={item.type === 'color' ? { color: `var(--palette-${item.id})` } : undefined}
					onPointerEnter={handleButtonPointerEnter}
					onPointerDown={handleButtonPointerDown}
					onPointerUp={handleButtonPointerUp}
					onClick={handleButtonClick}
					onKeyDown={handleKeyDown}
					kbd={
						isFocused &&
						editor.isChangingStyle &&
						props.dynamicKbdBinding &&
						index < dynamicKbdOptions.length
							? dynamicKbdOptions[index]
							: undefined
					}
					icon={item.icon as TLUiIconType}
				/>
			))}
		</div>
	)
}

/** @internal */
export const ButtonPicker = React.memo(_ButtonPicker)
