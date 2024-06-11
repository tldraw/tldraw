import {
	DefaultColorStyle,
	SharedStyle,
	StyleProp,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	useEditor,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactElement, memo, useMemo, useRef } from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './Button/TldrawUiButtonIcon'

/** @public */
export interface TLUiButtonPickerProps<T extends string> {
	title: string
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	theme: TLDefaultColorTheme
	onValueChange: (style: StyleProp<T>, value: T) => void
}

/** @public */
export const TldrawUiButtonPicker = memo(function TldrawUiButtonPicker<T extends string>(
	props: TLUiButtonPickerProps<T>
) {
	const {
		uiType,
		items,
		title,
		style,
		value,
		// columns = clamp(items.length, 2, 4),
		onValueChange,
		theme,
	} = props
	const editor = useEditor()
	const msg = useTranslation()

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
			if (origActiveEl && ['TEXTAREA', 'INPUT'].includes(origActiveEl.nodeName)) {
				origActiveEl.focus()
			}
			rPointingOriginalActiveElement.current = null
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			editor.mark('point picker item')
			onValueChange(style, id as T)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			editor.mark('point picker item')
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
	}, [value, editor, onValueChange, style])

	return (
		<div data-testid={`style.${uiType}`} className={classNames('tlui-buttons__grid')}>
			{items.map((item) => (
				<TldrawUiButton
					type="icon"
					key={item.value}
					data-id={item.value}
					data-testid={`style.${uiType}.${item.value}`}
					aria-label={item.value}
					data-state={value.type === 'shared' && value.value === item.value ? 'hinted' : undefined}
					title={title + ' — ' + msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)}
					className={classNames('tlui-button-grid__button')}
					style={
						style === (DefaultColorStyle as StyleProp<unknown>)
							? { color: theme[item.value as TLDefaultColorStyle].solid }
							: undefined
					}
					onPointerEnter={handleButtonPointerEnter}
					onPointerDown={handleButtonPointerDown}
					onPointerUp={handleButtonPointerUp}
					onClick={handleButtonClick}
				>
					<TldrawUiButtonIcon icon={item.icon} />
				</TldrawUiButton>
			))}
		</div>
	)
}) as <T extends string>(props: TLUiButtonPickerProps<T>) => ReactElement
