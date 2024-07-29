import { SharedStyle, StyleProp } from '@tldraw/editor'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'

interface DoubleDropdownPickerProps<T extends string> {
	uiTypeA: string
	uiTypeB: string
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	labelA: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	labelB: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	itemsA: StyleValuesForUi<T>
	itemsB: StyleValuesForUi<T>
	styleA: StyleProp<T>
	styleB: StyleProp<T>
	valueA: SharedStyle<T>
	valueB: SharedStyle<T>
	onValueChange(style: StyleProp<T>, value: T): void
}

function _DoubleDropdownPicker<T extends string>({
	label,
	uiTypeA,
	uiTypeB,
	labelA,
	labelB,
	itemsA,
	itemsB,
	styleA,
	styleB,
	valueA,
	valueB,
	onValueChange,
}: DoubleDropdownPickerProps<T>) {
	const msg = useTranslation()

	const iconA = React.useMemo(
		() =>
			itemsA.find((item) => valueA.type === 'shared' && valueA.value === item.value)?.icon ??
			'mixed',
		[itemsA, valueA]
	)
	const iconB = React.useMemo(
		() =>
			itemsB.find((item) => valueB.type === 'shared' && valueB.value === item.value)?.icon ??
			'mixed',
		[itemsB, valueB]
	)

	if (valueA === undefined && valueB === undefined) return null

	return (
		<div className="tlui-style-panel__double-select-picker">
			<div title={msg(label)} className="tlui-style-panel__double-select-picker-label">
				{msg(label)}
			</div>
			<div className="tlui-buttons__horizontal">
				<TldrawUiDropdownMenuRoot id={`style panel ${uiTypeA} A`}>
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							data-testid={`style.${uiTypeA}`}
							title={
								msg(labelA) +
								' — ' +
								(valueA === null || valueA.type === 'mixed'
									? msg('style-panel.mixed')
									: msg(`${uiTypeA}-style.${valueA.value}` as TLUiTranslationKey))
							}
						>
							<TldrawUiButtonIcon icon={iconA} small invertIcon />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="left" align="center" sideOffset={80} alignOffset={0}>
						<div className="tlui-buttons__grid">
							{itemsA.map((item, i) => {
								return (
									<TldrawUiDropdownMenuItem key={i} data-testid={`style.${uiTypeA}.${item.value}`}>
										<TldrawUiButton
											type="icon"
											key={item.value}
											onClick={() => onValueChange(styleA, item.value)}
											title={`${msg(labelA)} — ${msg(`${uiTypeA}-style.${item.value}`)}`}
										>
											<TldrawUiButtonIcon icon={item.icon} invertIcon />
										</TldrawUiButton>
									</TldrawUiDropdownMenuItem>
								)
							})}
						</div>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
				<TldrawUiDropdownMenuRoot id={`style panel ${uiTypeB}`}>
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							data-testid={`style.${uiTypeB}`}
							title={
								msg(labelB) +
								' — ' +
								(valueB === null || valueB.type === 'mixed'
									? msg('style-panel.mixed')
									: msg(`${uiTypeB}-style.${valueB.value}` as TLUiTranslationKey))
							}
						>
							<TldrawUiButtonIcon icon={iconB} small />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="left" align="center" sideOffset={116} alignOffset={0}>
						<div className="tlui-buttons__grid">
							{itemsB.map((item) => {
								return (
									<TldrawUiDropdownMenuItem key={item.value}>
										<TldrawUiButton
											type="icon"
											title={`${msg(labelB)} — ${msg(`${uiTypeB}-style.${item.value}` as TLUiTranslationKey)}`}
											data-testid={`style.${uiTypeB}.${item.value}`}
											onClick={() => onValueChange(styleB, item.value)}
										>
											<TldrawUiButtonIcon icon={item.icon} />
										</TldrawUiButton>
									</TldrawUiDropdownMenuItem>
								)
							})}
						</div>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			</div>
		</div>
	)
}

// need to memo like this to get generics
export const DoubleDropdownPicker = React.memo(
	_DoubleDropdownPicker
) as typeof _DoubleDropdownPicker
