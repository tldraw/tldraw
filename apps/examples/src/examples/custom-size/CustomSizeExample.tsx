import { SizeStyle } from '@tldraw/tlschema/src/styles/TLSizeStyle'
import { T, Tldraw, TldrawUiSlider, TLUiComponents, useTranslation } from 'tldraw'
import { SizeStyleUtil } from 'tldraw/src/lib/styles/TLSizeStyle'
import { DefaultStylePanelSizePickerProps } from 'tldraw/src/lib/ui/components/StylePanel/DefaultStylePanelSizePicker'
import 'tldraw/tldraw.css'

class MySizeStyleUtil extends SizeStyleUtil<number> {
	static validator = T.number

	override getDefaultValue(): number {
		return 30
	}

	override toStrokeSizePx(value: number): number {
		return value * 0.15
	}
	override toFontSizePx(value: number): number {
		return value
	}
	override toLabelFontSizePx(value: number): number {
		return value
	}
	override toArrowLabelFontSizePx(value: number): number {
		return value * 0.8
	}
}

function CustomSizePicker({
	showUiLabels,
	styles,
	onChange,
	onHistoryMark,
}: DefaultStylePanelSizePickerProps) {
	const msg = useTranslation()
	const size = styles.get<number>(SizeStyle)

	if (size === undefined) return null

	return (
		<>
			{showUiLabels && <h3 className="tlui-style-panel__subheading">{msg('style-panel.size')}</h3>}
			<TldrawUiSlider
				data-testid="style.opacity"
				value={size.type === 'mixed' ? 50 : size.value}
				label="Size"
				onValueChange={(value) => onChange(SizeStyle, value + 1)}
				steps={100}
				title={msg('style-panel.opacity')}
				onHistoryMark={onHistoryMark}
				ariaValueModifier={25}
			/>
		</>
	)
}

const styleUtils = [MySizeStyleUtil]
const components: TLUiComponents = {
	StylePanelSizePicker: CustomSizePicker,
}

export default function CustomSizeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw styleUtils={styleUtils} components={components} />
		</div>
	)
}
