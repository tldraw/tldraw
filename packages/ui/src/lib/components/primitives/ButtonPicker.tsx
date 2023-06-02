import { TLStyleItem, TLStyleType, useEditor } from '@tldraw/editor'
import { clamp } from '@tldraw/primitives'
import classNames from 'classnames'
import * as React from 'react'
import { useRef } from 'react'
import { TLTranslationKey } from '../../hooks/useTranslation/TLTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button } from './Button'

/** @public */
export interface ButtonPickerProps<T extends TLStyleItem> {
	title: string
	items: T[]
	styleType: TLStyleType
	value?: string | number | null
	columns?: 2 | 3 | 4
	'data-testid'?: string
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
	const app = useEditor()
	const msg = useTranslation()

	const rPointing = useRef(false)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
	} = React.useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			window.removeEventListener('pointerup', handlePointerUp)
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value === id) return

			app.mark('point picker item')
			onValueChange(items.find((i) => i.id === id)!, false)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			app.mark('point picker item')
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

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
		}
	}, [app, value, onValueChange, items])

	return (
		<div
			className={classNames('tlui-button-grid', {
				'tlui-button-grid__two': columns === 2,
				'tlui-button-grid__three': columns === 3,
				'tlui-button-grid__four': columns === 4,
			})}
		>
			{items.map((item) => (
				<Button
					key={item.id}
					data-id={item.id}
					data-testid={`${props['data-testid']}.${item.id}`}
					aria-label={item.id}
					data-state={value === item.id ? 'hinted' : undefined}
					title={title + ' — ' + msg(`${styleType}-style.${item.id}` as TLTranslationKey)}
					className={classNames('tlui-button-grid__button')}
					style={item.type === 'color' ? { color: `var(--palette-${item.id})` } : undefined}
					onPointerEnter={handleButtonPointerEnter}
					onPointerDown={handleButtonPointerDown}
					onPointerUp={handleButtonPointerUp}
					onClick={handleButtonClick}
					icon={item.icon as TLUiIconType}
				/>
			))}
		</div>
	)
}

/** @public */
export const ButtonPicker = React.memo(_ButtonPicker)
