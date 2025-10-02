import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { ConfigPanelBooleanControl } from '../config-panel/ConfigPanelBooleanControl'
import { ConfigPanelSlider } from '../config-panel/ConfigPanelSlider'
import { particleConfig, resetParticleConfig } from './config'

/**
 * Configuration panel for the particle physics simulation.
 * Provides UI controls for adjusting particle count, size, gravity, and damping.
 */
export function ParticlePhysicsConfigPanel() {
	const config = useValue('config', () => particleConfig.get(), [])

	const handleChange = useCallback((prop: string, value: number | boolean) => {
		particleConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel onReset={resetParticleConfig}>
			<ConfigPanelSlider
				prop="particleCount"
				label="particles"
				min={32}
				max={256}
				value={config.particleCount}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="particleSize"
				label="size"
				min={1}
				max={10}
				value={config.particleSize}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="gravity"
				label="gravity"
				min={0}
				max={2}
				value={config.gravity}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="damping"
				label="damping"
				min={0}
				max={1}
				value={config.damping}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="pixelate"
				label="pixelate"
				value={config.pixelate}
				onChange={handleChange}
			/>
		</ConfigPanel>
	)
}
