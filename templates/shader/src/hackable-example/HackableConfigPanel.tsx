import { useCallback } from 'react'
import { TldrawUiButton, useValue } from 'tldraw'
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { ConfigPanelBooleanControl } from '../config-panel/ConfigPanelBooleanControl'
import { ConfigPanelSlider } from '../config-panel/ConfigPanelSlider'
import { resetShaderConfig, shaderConfig } from './config'

export function HackableConfigPanel() {
	const config = useValue('config', () => shaderConfig.get(), [])

	const handleChange = useCallback((prop: string, value: number | boolean) => {
		shaderConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel>
			<TldrawUiButton type="menu" onClick={resetShaderConfig}>
				Reset to Defaults
			</TldrawUiButton>

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
