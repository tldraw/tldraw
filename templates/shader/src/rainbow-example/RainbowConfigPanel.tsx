import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { ConfigPanelBooleanControl } from '../config-panel/ConfigPanelBooleanControl'
import { ConfigPanelSlider } from '../config-panel/ConfigPanelSlider'
import { resetShaderConfig, shaderConfig } from './config'

/**
 * Configuration panel for the rainbow shader effect.
 * Provides UI controls for adjusting:
 * - Quality (rendering resolution)
 * - Radius (size of the rainbow halo effect)
 * - Other shader-specific parameters
 */
export function RainbowConfigPanel() {
	const config = useValue('config', () => shaderConfig.get(), [])

	const handleChange = useCallback((prop: string, value: number | boolean) => {
		shaderConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel onReset={resetShaderConfig}>
			{Object.entries(config).map(([prop, value], i) =>
				typeof value === 'number' ? (
					<ConfigPanelSlider
						key={i}
						prop={prop}
						label={prop}
						min={0}
						max={1}
						value={value}
						type="float"
						onChange={handleChange}
					/>
				) : typeof value === 'boolean' ? (
					<ConfigPanelBooleanControl
						key={i}
						prop={prop}
						label={prop}
						value={value}
						onChange={handleChange}
					/>
				) : null
			)}
		</ConfigPanel>
	)
}
