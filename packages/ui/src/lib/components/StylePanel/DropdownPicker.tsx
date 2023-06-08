import { Trigger } from '@radix-ui/react-dropdown-menu'
import { Editor, TLStyleItem, TLStyleType } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button } from '../primitives/Button'
import * as DropdownMenu from '../primitives/DropdownMenu'

type AllStyles = typeof Editor.styles

interface DropdownPickerProps<T extends AllStyles[keyof AllStyles][number]> {
	id: string
	label?: TLUiTranslationKey
	items: T[]
	styleType: TLStyleType
	value: T['id'] | null
	'data-testid'?: string
	onValueChange: (value: TLStyleItem, squashing: boolean) => void
}

export const DropdownPicker = React.memo(function DropdownPicker<
	T extends AllStyles[keyof AllStyles][number]
>({
	id,
	items,
	styleType,
	label,
	value,
	onValueChange,
	'data-testid': testId,
}: DropdownPickerProps<T>) {
	const msg = useTranslation()

	const icon = React.useMemo(() => items.find((item) => item.id === value)?.icon, [items, value])

	return (
		<DropdownMenu.Root id={`style panel ${id}`}>
			<Trigger asChild>
				<Button
					data-testid={testId}
					title={
						value === null
							? msg('style-panel.mixed')
							: msg(`${styleType}-style.${value}` as TLUiTranslationKey)
					}
					label={label}
					icon={(icon as TLUiIconType) ?? 'mixed'}
				/>
			</Trigger>
			<DropdownMenu.Content side="left" align="center" alignOffset={0}>
				<div
					className={classNames('tlui-button-grid', {
						'tlui-button-grid__two': items.length < 3,
						'tlui-button-grid__three': items.length == 3,
						'tlui-button-grid__four': items.length >= 4,
					})}
				>
					{items.map((item) => {
						return (
							<DropdownMenu.Item
								className="tlui-button-grid__button"
								data-testid={`${testId}.${item.id}`}
								title={msg(`${styleType}-style.${item.id}` as TLUiTranslationKey)}
								key={item.id}
								icon={item.icon as TLUiIconType}
								onClick={() => onValueChange(item as TLStyleItem, false)}
							/>
						)
					})}
				</div>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
})
