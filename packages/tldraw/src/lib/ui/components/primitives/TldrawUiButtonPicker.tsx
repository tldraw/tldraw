import {
	DefaultColorStyle,
	SharedStyle,
	StyleProp,
	TLDefaultColorStyle,
	getDefaultColorTheme,
	useEditor,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useMemo, useRef } from 'react'
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
	onValueChange: (style: StyleProp<T>, value: T, squashing: boolean) => void
}

function _TldrawUiButtonPicker<T extends string>(props: TLUiButtonPickerProps<T>) {
	const {
		uiType,
		items,
		title,
		style,
		value,
		// columns = clamp(items.length, 2, 4),
		onValueChange,
	} = props
	const editor = useEditor()
	const msg = useTranslation()

	const rPointing = useRef(false)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
	} = useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			window.removeEventListener('pointerup', handlePointerUp)
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			editor.mark('point picker item')
			onValueChange(style, id as T, false)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset

			editor.mark('point picker item')
			onValueChange(style, id as T, true)

			rPointing.current = true
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			onValueChange(style, id as T, true)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (value.type === 'shared' && value.value === id) return

			onValueChange(style, id as T, false)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
		}
	}, [value, editor, onValueChange, style])

	const theme = useValue(
		'theme',
		() => getDefaultColorTheme({ isDarkMode: editor.user.getIsDarkMode() }),
		[editor]
	)

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
}
/** @public */
export const TldrawUiButtonPicker = memo(_TldrawUiButtonPicker) as typeof _TldrawUiButtonPicker
