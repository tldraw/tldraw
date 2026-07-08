import { SharedStyle, StyleProp, tlmenus, useEditor } from '@tldraw/editor'
import { TlButtonIcon } from '@tldraw/ui'
import { TlButtonLabel } from '@tldraw/ui'
import { TlPopover, TlPopoverContent, TlPopoverTrigger } from '@tldraw/ui'
import { TlToolbar, TlToolbarButton } from '@tldraw/ui'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { useStylePanelContext } from './StylePanelContext'

/** @public */
export interface StylePanelDropdownPickerProps<T extends string> {
	id: string
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	uiType: string
	stylePanelType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	type: 'icon' | 'tool' | 'menu'
	onValueChange?(style: StyleProp<T>, value: T): void
	/** Override the test ID prefix. Defaults to uiType. */
	testIdType?: string
	/**
	 * Distance to push the popover left of the trigger so it lands flush with the style panel.
	 * Defaults to the standard popover gap so standalone dropdowns don't sit flush against the panel.
	 */
	sideOffset?: number
	/** Is the dropdown an overflow of a different radio group? If so, show active when the group's active item is inside of the dropdown.*/
	isOverflow?: boolean
}

function StylePanelDropdownPickerInner<T extends string>(props: StylePanelDropdownPickerProps<T>) {
	const msg = useTranslation()
	const toolbarLabel = props.label
		? msg(props.label)
		: msg(`style-panel.${props.stylePanelType}` as TLUiTranslationKey)
	return (
		<TlToolbar label={toolbarLabel}>
			<StylePanelDropdownPickerInline {...props} />
		</TlToolbar>
	)
}

function StylePanelDropdownPickerInlineInner<T extends string>(
	props: StylePanelDropdownPickerProps<T>
) {
	const ctx = useStylePanelContext()
	const {
		id,
		label,
		uiType,
		stylePanelType,
		isOverflow,
		style,
		items,
		type,
		value,
		onValueChange = ctx.onValueChange,
		testIdType = uiType,
		sideOffset = 8,
	} = props
	const msg = useTranslation()
	const editor = useEditor()
	const [isOpen, setIsOpen] = React.useState(false)

	const icon = React.useMemo(() => {
		if (value.type === 'mixed') return 'mixed' as TLUiIconType
		const match = items.find((item) => item.value === value.value)?.icon
		return match ?? items[0]?.icon
	}, [items, value])

	const stylePanelName = msg(`style-panel.${stylePanelType}` as TLUiTranslationKey)

	// The current value isn't always present in this dropdown's items (for example the fill
	// dropdown only holds the "extra" fills, so a "solid" selection lives elsewhere). When the
	// selected value isn't one of these items, describe what the dropdown opens rather than a
	// value it can't show.
	const valueInItems = value.type !== 'mixed' && items.some((item) => item.value === value.value)
	const titleStr =
		value.type === 'mixed'
			? msg('style-panel.mixed')
			: valueInItems
				? stylePanelName + ' — ' + msg(`${uiType}-style.${value.value}` as TLUiTranslationKey)
				: stylePanelName
	const labelStr = label ? msg(label) : ''

	const popoverId = `style panel ${id}`
	return (
		<TlPopover
			id={popoverId}
			open={isOpen}
			onOpenChange={setIsOpen}
			className="tlui-style-panel__dropdown-picker"
		>
			<TlPopoverTrigger>
				<TlToolbarButton
					type={type}
					data-testid={`style.${testIdType}`}
					data-direction="left"
					isActive={isOverflow && valueInItems}
					title={titleStr}
				>
					{labelStr && <TlButtonLabel>{labelStr}</TlButtonLabel>}
					<TlButtonIcon icon={icon as TLUiIconType} />
				</TlToolbarButton>
			</TlPopoverTrigger>
			<TlPopoverContent side="left" align="center" sideOffset={sideOffset}>
				<TlToolbar orientation={items.length > 4 ? 'grid' : 'horizontal'} label={labelStr}>
					<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
						{items.map((item) => {
							return (
								<TlToolbarButton
									key={item.value}
									type="icon"
									data-testid={`style.${testIdType}.${item.value}`}
									title={
										stylePanelName +
										' — ' +
										msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)
									}
									isActive={valueInItems && icon === item.icon}
									onClick={() => {
										ctx.onHistoryMark('select style dropdown item')
										onValueChange(style, item.value)
										tlmenus.deleteOpenMenu(popoverId, editor.contextId)
										setIsOpen(false)
									}}
								>
									<TlButtonIcon icon={item.icon} />
								</TlToolbarButton>
							)
						})}
					</TldrawUiMenuContextProvider>
				</TlToolbar>
			</TlPopoverContent>
		</TlPopover>
	)
}

// need to export like this to get generics
/** @public @react */
export const StylePanelDropdownPicker = React.memo(StylePanelDropdownPickerInner) as <
	T extends string,
>(
	props: StylePanelDropdownPickerProps<T>
) => React.JSX.Element

/** @public @react */
export const StylePanelDropdownPickerInline = React.memo(StylePanelDropdownPickerInlineInner) as <
	T extends string,
>(
	props: StylePanelDropdownPickerProps<T>
) => React.JSX.Element
