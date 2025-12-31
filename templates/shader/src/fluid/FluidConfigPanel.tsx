import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { ConfigPanelBooleanControl } from '../config-panel/ConfigPanelBooleanControl'
import { ConfigPanelSlider } from '../config-panel/ConfigPanelSlider'
import { fluidConfig, resetFluidConfig } from './config'

/**
 * Configuration panel for the fluid simulation.
 * Provides UI controls for adjusting all fluid simulation parameters including:
 * - General settings (quality, velocity)
 * - Simulation parameters (resolution, dissipation, pressure)
 * - Splat settings (radius, force, colors)
 * - Post-processing effects (bloom, sunrays)
 */
export function FluidConfigPanel() {
	const config = useValue('config', () => fluidConfig.get(), [])

	const handleChange = useCallback((prop: string, value: number | boolean) => {
		fluidConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel onReset={resetFluidConfig}>
			{/* General Settings */}
			<ConfigPanelSlider
				prop="quality"
				label="Quality"
				min={0.001}
				max={1}
				value={config.quality}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="velocityScale"
				label="Velocity Scale"
				min={0}
				max={0.1}
				value={config.velocityScale}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="boundsSampleCount"
				label="Bounds Sample Ct."
				min={4}
				max={100}
				value={config.boundsSampleCount}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="paused"
				label="Paused"
				value={config.paused}
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="transparent"
				label="Transparent Bg"
				value={config.transparent}
				onChange={handleChange}
			/>

			{/* Simulation Settings */}
			<ConfigPanelSlider
				prop="simResolution"
				label="Sim Quality"
				min={32}
				max={512}
				value={config.simResolution}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="dyeResolution"
				label="Dye Quality"
				min={256}
				max={2048}
				value={config.dyeResolution}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="densityDissipation"
				label="Density Diss."
				min={0}
				max={4}
				value={config.densityDissipation}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="velocityDissipation"
				label="Velocity Diss."
				min={0}
				max={1}
				value={config.velocityDissipation}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="pressure"
				label="Pressure"
				min={0}
				max={2}
				value={config.pressure}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="pressureIterations"
				label="Pressure Iter."
				min={1}
				max={60}
				value={config.pressureIterations}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="curl"
				label="Curl (Vorticity)"
				min={0}
				max={100}
				value={config.curl}
				type="int"
				onChange={handleChange}
			/>

			{/* Splat Settings */}
			<ConfigPanelSlider
				prop="splatRadius"
				label="Splat Radius"
				min={0.01}
				max={1}
				value={config.splatRadius}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="splatForce"
				label="Splat Force"
				min={1000}
				max={20000}
				value={config.splatForce}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="shading"
				label="Shading"
				value={config.shading}
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="colorful"
				label="Colorful Mode"
				value={config.colorful}
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="colorUpdateSpeed"
				label="Color Speed"
				min={1}
				max={50}
				value={config.colorUpdateSpeed}
				type="int"
				onChange={handleChange}
			/>

			{/* Post-Processing */}
			<ConfigPanelBooleanControl
				prop="bloom"
				label="Bloom Effect"
				value={config.bloom}
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="bloomIterations"
				label="Bloom Iter."
				min={1}
				max={20}
				value={config.bloomIterations}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="bloomResolution"
				label="Bloom Res."
				min={64}
				max={512}
				value={config.bloomResolution}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="bloomIntensity"
				label="Bloom Int."
				min={0}
				max={2}
				value={config.bloomIntensity}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="bloomThreshold"
				label="Bloom Thresh."
				min={0}
				max={1}
				value={config.bloomThreshold}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="bloomSoftKnee"
				label="Bloom Soft Knee"
				min={0}
				max={1}
				value={config.bloomSoftKnee}
				type="float"
				onChange={handleChange}
			/>

			<ConfigPanelBooleanControl
				prop="sunrays"
				label="Sunrays Effect"
				value={config.sunrays}
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="sunraysResolution"
				label="Sunrays Res."
				min={64}
				max={512}
				value={config.sunraysResolution}
				type="int"
				onChange={handleChange}
			/>
			<ConfigPanelSlider
				prop="sunraysWeight"
				label="Sunrays Weight"
				min={0}
				max={2}
				value={config.sunraysWeight}
				type="float"
				onChange={handleChange}
			/>
		</ConfigPanel>
	)
}
