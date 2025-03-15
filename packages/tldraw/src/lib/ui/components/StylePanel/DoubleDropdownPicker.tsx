import { SharedStyle, StyleProp, tlmenus, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'

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

function DoubleDropdownPickerInner<T extends string>({
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
	const editor = useEditor()
	const msg = useTranslation()
	const [isOpenA, setIsOpenA] = React.useState(false)
	const [isOpenB, setIsOpenB] = React.useState(false)

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

	const idA = `style panel ${uiTypeA} A`
	const idB = `style panel ${uiTypeB} B`
	return (
		<div className="tlui-style-panel__double-select-picker">
			<div title={msg(label)} className="tlui-style-panel__double-select-picker-label">
				{msg(label)}
			</div>
			<div className="tlui-buttons__horizontal">
				<TldrawUiPopover id={idA} open={isOpenA} onOpenChange={setIsOpenA}>
					<TldrawUiPopoverTrigger>
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
					</TldrawUiPopoverTrigger>
					<TldrawUiPopoverContent side="left" align="center" sideOffset={80} alignOffset={0}>
						<div className="tlui-buttons__grid">
							{itemsA.map((item, i) => {
								return (
									<TldrawUiMenuContextProvider key={i} type="icons" sourceId="style-panel">
										<TldrawUiButton
											data-testid={`style.${uiTypeA}.${item.value}`}
											type="icon"
											key={item.value}
											onClick={() => {
												onValueChange(styleA, item.value)
												tlmenus.deleteOpenMenu(idA, editor.contextId)
												setIsOpenA(false)
											}}
											title={`${msg(labelA)} — ${msg(`${uiTypeA}-style.${item.value}`)}`}
										>
											<TldrawUiButtonIcon icon={item.icon} invertIcon />
										</TldrawUiButton>
									</TldrawUiMenuContextProvider>
								)
							})}
						</div>
					</TldrawUiPopoverContent>
				</TldrawUiPopover>
				<TldrawUiPopover id={idB} open={isOpenB} onOpenChange={setIsOpenB}>
					<TldrawUiPopoverTrigger>
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
					</TldrawUiPopoverTrigger>
					<TldrawUiPopoverContent side="left" align="center" sideOffset={116} alignOffset={0}>
						<div className="tlui-buttons__grid">
							{itemsB.map((item) => {
								return (
									<TldrawUiMenuContextProvider key={item.value} type="icons" sourceId="style-panel">
										<TldrawUiButton
											type="icon"
											title={`${msg(labelB)} — ${msg(`${uiTypeB}-style.${item.value}` as TLUiTranslationKey)}`}
											data-testid={`style.${uiTypeB}.${item.value}`}
											onClick={() => {
												onValueChange(styleB, item.value)
												tlmenus.deleteOpenMenu(idB, editor.contextId)
												setIsOpenB(false)
											}}
										>
											<TldrawUiButtonIcon icon={item.icon} />
										</TldrawUiButton>
									</TldrawUiMenuContextProvider>
								)
							})}
						</div>
					</TldrawUiPopoverContent>
				</TldrawUiPopover>
			</div>
		</div>
	)
}

// need to memo like this to get generics
export const DoubleDropdownPicker = React.memo(
	DoubleDropdownPickerInner
) as typeof DoubleDropdownPickerInner
