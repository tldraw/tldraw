import { Trigger } from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import * as React from 'react'
import { TLUiStyle } from '../../hooks/useStylesProvider'
import { TLTranslationKey } from '../../hooks/useTranslation/TLTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { Button } from '../primitives/Button'
import * as DropdownMenu from '../primitives/DropdownMenu'

interface DropdownPickerProps<T extends TLUiStyle> {
	id: string
	label?: TLTranslationKey
	items: T[]
	styleType: string
	value: T['id'] | null
	'data-wd'?: string
	onValueChange: (value: T, styleType: string, squashing: boolean) => void
}

export const DropdownPicker = React.memo(function DropdownPicker<T extends TLUiStyle>({
	id,
	items,
	styleType,
	label,
	value,
	onValueChange,
	'data-wd': dataWd,
}: DropdownPickerProps<T>) {
	const msg = useTranslation()

	const icon = React.useMemo(() => items.find((item) => item.id === value)?.icon, [items, value])

	return (
		<DropdownMenu.Root id={`style panel ${id}`}>
			<Trigger asChild>
				<Button
					data-wd={dataWd}
					title={
						value === null
							? msg('style-panel.mixed')
							: msg(`${styleType}-style.${value}` as TLTranslationKey)
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
								data-wd={`${dataWd}.${item.id}`}
								title={msg(`${styleType}-style.${item.id}` as TLTranslationKey)}
								key={item.id}
								icon={item.icon as TLUiIconType}
								onClick={() => onValueChange(item, styleType, false)}
							/>
						)
					})}
				</div>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
})
