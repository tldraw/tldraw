import { Trigger } from '@radix-ui/react-dropdown-menu'
import { SharedStyle, StyleProp, preventDefault } from '@tldraw/editor'
import * as React from 'react'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button, TLUiButtonProps } from '../primitives/Button'
import * as DropdownMenu from '../primitives/DropdownMenu'
import { StyleValuesForUi } from './styles'

interface DropdownPickerProps<T extends string> {
	id: string
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	type: TLUiButtonProps['type']
	onValueChange: (style: StyleProp<T>, value: T, squashing: boolean) => void
}

export const DropdownPicker = React.memo(function DropdownPicker<T extends string>({
	id,
	label,
	uiType,
	style,
	items,
	type,
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
			<Trigger
				asChild
				// Firefox fix: Stop the dropdown immediately closing after touch
				onTouchEnd={(e) => preventDefault(e)}
			>
				<Button
					type={type}
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
				<div className="tlui-buttons__grid">
					{items.map((item) => {
						return (
							<DropdownMenu.Item
								type="icon"
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
