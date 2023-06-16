import { Trigger } from '@radix-ui/react-dropdown-menu'
import { SharedStyle, StyleProp } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button } from '../primitives/Button'
import * as DropdownMenu from '../primitives/DropdownMenu'
import { StyleValuesForUi } from './styles'

interface DropdownPickerProps<T extends string> {
	id: string
	label?: TLUiTranslationKey
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	onValueChange: (style: StyleProp<T>, value: T, squashing: boolean) => void
}

export const DropdownPicker = React.memo(function DropdownPicker<T extends string>({
	id,
	label,
	uiType,
	style,
	items,
	value,
	onValueChange,
}: DropdownPickerProps<T>) {
	const msg = useTranslation()

	const icon = React.useMemo(
		() => items.find((item) => value.type === 'shared' && item.value === value.value)?.icon,
		[items, value]
	)

	return (
		<DropdownMenu.Root id={`style panel ${id}`}>
			<Trigger asChild>
				<Button
					data-testid={`style.${uiType}`}
					title={
						value.type === 'mixed'
							? msg('style-panel.mixed')
							: msg(`${uiType}-style.${value.value}` as TLUiTranslationKey)
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
								data-testid={`style.${uiType}.${item.value}`}
								title={msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)}
								key={item.value}
								icon={item.icon as TLUiIconType}
								onClick={() => onValueChange(style, item.value, false)}
							/>
						)
					})}
				</div>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
})
