import {
	DefaultColorStyle,
	getColorValue,
	SharedStyle,
	StyleProp,
	TLDefaultColorStyle,
	useEditor,
} from '@tldraw/editor'
import { memo, ReactElement, useMemo, useRef } from 'react'
import { useDefaultColorTheme } from '../../../shapes/shared/useDefaultColorTheme'
import { StyleValuesForUi } from '../../../styles'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
} from '../primitives/TldrawUiToolbar'
import { TldrawUiGrid, TldrawUiRow } from '../primitives/layout'
import { useStylePanelContext } from './StylePanelContext'
import { StylePanelSubheading } from './StylePanelSubheading'

/** @public */
export interface StylePanelButtonPickerProps<T extends string> {
	title: string
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	onValueChange?(style: StyleProp<T>, value: T): void
	onHistoryMark?(id: string): void
}

/** @public */
export const StylePanelButtonPicker = memo(function StylePanelButtonPicker<T extends string>(
	props: StylePanelButtonPickerProps<T>
) {
	const ctx = useStylePanelContext()

	const {
		uiType,
		items,
		title,
		style,
		value,
		onValueChange = ctx.onValueChange,
		onHistoryMark = ctx.onHistoryMark,
	} = props
	const theme = useDefaultColorTheme()
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const rPointing = useRef(false)
	const rPointingOriginalActiveElement = useRef<HTMLElement | null>(null)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
	} = useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			window.removeEventListener('pointerup', handlePointerUp)

			// This is fun little micro-optimization to make sure that the focus
			// is retained on a text label. That way, you can continue typing
			// after selecting a style.
			const origActiveEl = rPointingOriginalActiveElement.current
			if (
				origActiveEl &&
				(['TEXTAREA', 'INPUT'].includes(origActiveEl.nodeName) || origActiveEl.isContentEditable)
			) {
				origActiveEl.focus()
			} else if (breakpoint >= PORTRAIT_BREAKPOINT.TABLET_SM) {
				editor.getContainer().focus()
			}
			rPointingOriginalActiveElement.current = null
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			onHistoryMark?.('point picker item')
			onValueChange(style, id as T)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			onHistoryMark?.('point picker item')
			onValueChange(style, id as T)

			rPointing.current = true
			rPointingOriginalActiveElement.current = document.activeElement as HTMLElement
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			onValueChange(style, id as T)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			onValueChange(style, id as T)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
		}
	}, [editor, breakpoint, value, onHistoryMark, onValueChange, style])

	const Layout = items.length > 4 ? TldrawUiGrid : TldrawUiRow

	return (
		<>
			{ctx.showUiLabels && <StylePanelSubheading>{title}</StylePanelSubheading>}
			<TldrawUiToolbar label={title}>
				<TldrawUiToolbarToggleGroup
					data-testid={`style.${uiType}`}
					type="single"
					value={value.type === 'shared' ? value.value : undefined}
					asChild
				>
					<Layout>
						{items.map((item) => {
							const label =
								title + ' — ' + msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)
							return (
								<TldrawUiToolbarToggleItem
									type="icon"
									key={item.value}
									data-id={item.value}
									data-testid={`style.${uiType}.${item.value}`}
									aria-label={label}
									value={item.value}
									data-state={value.type === 'shared' && value.value === item.value ? 'on' : 'off'}
									data-isactive={value.type === 'shared' && value.value === item.value}
									title={label}
									style={
										style === (DefaultColorStyle as StyleProp<unknown>)
											? { color: getColorValue(theme, item.value as TLDefaultColorStyle, 'solid') }
											: undefined
									}
									onPointerEnter={handleButtonPointerEnter}
									onPointerDown={handleButtonPointerDown}
									onPointerUp={handleButtonPointerUp}
									onClick={handleButtonClick}
								>
									<TldrawUiButtonIcon icon={item.icon} />
								</TldrawUiToolbarToggleItem>
							)
						})}
					</Layout>
				</TldrawUiToolbarToggleGroup>
			</TldrawUiToolbar>
		</>
	)
}) as <T extends string>(props: StylePanelButtonPickerProps<T>) => ReactElement
