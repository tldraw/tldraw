import { TldrawUiSlider } from 'tldraw'
import { ConfigPanelLabel } from './ConfigPanelLabel'

const STEPS = 100

export function ConfigPanelSlider({
	prop,
	label,
	min,
	max,
	value,
	onChange,
	type,
}: {
	prop: string
	label: string
	min: number
	max: number
	value: number
	type: 'float' | 'int'
	onChange: (prop: string, value: number) => void
}) {
	// Map actual value (min to max) to slider value (1 to STEPS)
	const sliderValue = value != null ? 1 + ((value - min) / (max - min)) * (STEPS - 1) : 1

	return (
		<div className="shader-config-panel__control shader-config-panel__control--slider">
			<ConfigPanelLabel>{label}</ConfigPanelLabel>
			<TldrawUiSlider
				steps={STEPS}
				min={1}
				value={sliderValue}
				label={sliderValue.toFixed(0) + '%'}
				title={label}
				onValueChange={(sliderValue) => {
					const actualValue = min + ((sliderValue - 1) / (STEPS - 1)) * (max - min)
					onChange(prop, type === 'float' ? actualValue : Math.round(actualValue))
				}}
			/>
		</div>
	)
}
