import {
	ReadonlySharedStyleMap,
	SharedStyle,
	SizeStyle,
	TLDefaultColorTheme,
	TLDefaultSizeStyle,
	TLSizeStyle,
	useEditor,
} from '@tldraw/editor'
import { STYLES } from '../../../styles'
import { DefaultSizeStyleUtil, SizeStyleUtil } from '../../../styles/TLSizeStyle'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonPicker } from '../primitives/TldrawUiButtonPicker'
import { TldrawUiToolbar } from '../primitives/TldrawUiToolbar'

/** @public */
export interface DefaultStylePanelSizePickerProps {
	showUiLabels: boolean
	styles: ReadonlySharedStyleMap
	onChange(style: TLSizeStyle, value: unknown): void
	onHistoryMark(id: string): void
	theme: TLDefaultColorTheme
}

/** @public @react */
export function DefaultStylePanelSizePicker({
	showUiLabels,
	styles,
	onChange,
	onHistoryMark,
	theme,
}: DefaultStylePanelSizePickerProps) {
	const msg = useTranslation()
	const editor = useEditor()
	const size = styles.get(SizeStyle)

	if (size === undefined) return null
	if (!(editor.getStyleUtil(SizeStyleUtil) instanceof DefaultSizeStyleUtil)) return null

	return (
		<>
			{showUiLabels && <h3 className="tlui-style-panel__subheading">{msg('style-panel.size')}</h3>}
			<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.size')}>
				<TldrawUiButtonPicker
					title={msg('style-panel.size')}
					uiType="size"
					style={SizeStyle}
					items={STYLES.size}
					value={size as SharedStyle<TLDefaultSizeStyle>}
					onValueChange={onChange}
					theme={theme}
					onHistoryMark={onHistoryMark}
				/>
			</TldrawUiToolbar>
		</>
	)
}
