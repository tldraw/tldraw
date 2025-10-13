import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { ConfigPanelBooleanControl } from '../config-panel/ConfigPanelBooleanControl'
import { ConfigPanelSlider } from '../config-panel/ConfigPanelSlider'
import { resetShaderConfig, shaderConfig } from './config'

const SLIDER_CONFIGS: Record<string, { min: number; max: number }> = {
	quality: { min: 0.1, max: 1 },
	stepSize: { min: 1, max: 50 },
	steps: { min: 1, max: 100 },
}

export function RainbowConfigPanel() {
	const config = useValue('config', () => shaderConfig.get(), [])

	const handleChange = useCallback((prop: string, value: number | boolean) => {
		shaderConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel onReset={resetShaderConfig}>
			{Object.entries(config).map(([prop, value], i) => {
				if (typeof value === 'number') {
					const sliderConfig = SLIDER_CONFIGS[prop] || { min: 0, max: 1 }
					return (
						<ConfigPanelSlider
							key={i}
							prop={prop}
							label={prop}
							min={sliderConfig.min}
							max={sliderConfig.max}
							value={value}
							type="float"
							onChange={handleChange}
						/>
					)
				} else if (typeof value === 'boolean') {
					return (
						<ConfigPanelBooleanControl
							key={i}
							prop={prop}
							label={prop}
							value={value}
							onChange={handleChange}
						/>
					)
				}
				return null
			})}
		</ConfigPanel>
	)
}
